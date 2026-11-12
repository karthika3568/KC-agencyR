import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { hasPermission } from '../hooks/usePermission';
import { ROUTE_PERMISSIONS, getFirstAuthorizedRoute } from './navigationConfig';
import { ESC_PRIORITY, ROUTE_PARENT_MODULE_MAP } from './escNavigationConstants';

export { ESC_PRIORITY, ROUTE_PARENT_MODULE_MAP };

const EscNavigationContext = createContext({
  registerHandler: () => () => {},
  registerDirtyGuard: () => () => {},
  registerParentModuleNavigator: () => {},
});

let globalOrderCounter = 0;

export function EscNavigationProvider({ children, ConfirmDialogComponent = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handlersRef = useRef([]);
  const dirtyGuardsRef = useRef([]);
  const historyStackRef = useRef([]);
  const parentModuleNavigatedRef = useRef(false);
  const parentModuleNavigatorRef = useRef(null);
  const [unsavedPrompt, setUnsavedPrompt] = useState(null);

  // Track internal in-app route history
  useEffect(() => {
    const currentPath = location.pathname;

    // Reset parent module navigation flag and pending prompt on route transitions
    parentModuleNavigatedRef.current = false;
    setUnsavedPrompt(null);

    // Clear history on login screen; skip print views
    if (currentPath === '/login') {
      historyStackRef.current = [];
      return;
    }
    if (currentPath.startsWith('/print/')) return;

    const stack = historyStackRef.current;
    if (stack.length === 0 || stack[stack.length - 1] !== currentPath) {
      stack.push(currentPath);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!user) {
      historyStackRef.current = [];
      setUnsavedPrompt(null);
    }
  }, [user]);

  const registerHandler = useCallback((handlerObj) => {
    const id = Symbol('esc-handler');
    const entry = {
      id,
      priority: handlerObj.priority ?? ESC_PRIORITY.MODAL,
      handler: handlerObj.handler,
      enabled: handlerObj.enabled ?? true,
      hasUnsavedChanges: handlerObj.hasUnsavedChanges ?? null,
      getConfirmOptions: handlerObj.getConfirmOptions ?? null,
      order: ++globalOrderCounter,
    };
    handlersRef.current.push(entry);

    return () => {
      handlersRef.current = handlersRef.current.filter((h) => h.id !== id);
    };
  }, []);

  const registerDirtyGuard = useCallback((isDirtyRef, optionsRef) => {
    const id = Symbol('esc-dirty-guard');
    dirtyGuardsRef.current.push({ id, isDirtyRef, optionsRef });
    return () => {
      dirtyGuardsRef.current = dirtyGuardsRef.current.filter((g) => g.id !== id);
    };
  }, []);

  const registerParentModuleNavigator = useCallback((fn) => {
    parentModuleNavigatorRef.current = fn;
  }, []);

  // Centralized keydown handler
  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'Escape') return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.defaultPrevented) return;

    // 1. Check registered handlers (Confirm 110 > Dropdown 100 > Modal 80 > Nested 60)
    const active = handlersRef.current.filter((h) => h.enabled);
    if (active.length > 0) {
      // Sort priority descending, tie-break by registration order descending (LIFO)
      active.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return b.order - a.order;
      });

      for (const h of active) {
        try {
          const isDirty = typeof h.hasUnsavedChanges === 'function'
            ? Boolean(h.hasUnsavedChanges())
            : Boolean(h.hasUnsavedChanges);

          if (h.priority < ESC_PRIORITY.DROPDOWN && isDirty && ConfirmDialogComponent) {
            const opts = h.getConfirmOptions?.() || {};
            e.preventDefault();
            e.stopPropagation();
            setUnsavedPrompt({
              title: opts.confirmTitle || 'Discard unsaved changes?',
              message: opts.confirmMessage || 'You have unsaved edits. Discard them and go back?',
              confirmLabel: opts.confirmLabel || 'Discard Changes',
              cancelLabel: opts.cancelLabel || 'Stay',
              onConfirm: () => {
                setUnsavedPrompt(null);
                h.handler?.();
              },
            });
            return;
          }

          const result = h.handler();
          if (result !== false) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        } catch (err) {
          console.error('ESC handler error:', err);
        }
      }
    }

    // 2. Fallback check: Are there visible modals/dialogs in the DOM?
    const openDialog = document.querySelector(
      '[role="dialog"], [role="alertdialog"], .fixed.inset-0.z-50, .fixed.inset-0.z-40, .fixed.inset-0.z-30, .fixed.inset-0.z-20'
    );
    if (openDialog) {
      const closeBtn = openDialog.querySelector(
        'button[aria-label="Close modal"], button[aria-label="Close"], button[title="Close"], button[data-action="cancel"], button.btn-secondary'
      );
      if (closeBtn && !closeBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        closeBtn.click();
        return;
      }
      // If a modal is open, NEVER navigate underneath!
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // 3. Priority 4: Nested Module -> Parent Module in navigation
    const parentGroupId = ROUTE_PARENT_MODULE_MAP[location.pathname];
    if (parentGroupId && !parentModuleNavigatedRef.current && parentModuleNavigatorRef.current) {
      const handled = parentModuleNavigatorRef.current(parentGroupId);
      if (handled !== false) {
        parentModuleNavigatedRef.current = true;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    // 4. Priority 5: Main module page -> Previous application route
    const currentPath = location.pathname;
    const stack = historyStackRef.current;

    let targetRoute = null;
    let nextStackLength = stack.length;
    let usedRootFallback = false;

    for (let i = stack.length - 2; i >= 0; i--) {
      const prevRoute = stack[i];
      if (prevRoute && prevRoute !== currentPath) {
        const requiredPerm = ROUTE_PERMISSIONS[prevRoute];
        if (!requiredPerm || hasPermission(user, requiredPerm)) {
          targetRoute = prevRoute;
          nextStackLength = i + 1;
          break;
        }
      }
    }

    if (!targetRoute) {
      const isFieldSalesAuthorized =
        user?.role === 'Field Sales Executive' &&
        hasPermission(user, [
          'orders.create_prebooking',
          'orders.view_prebooking',
          'parties.manage_customers',
          'inventory.view_stock',
          'inventory.issue_van_stock',
        ]);
      const rootRoute =
        hasPermission(user, 'dashboard.view_financial_summary') || isFieldSalesAuthorized
          ? '/'
          : getFirstAuthorizedRoute(user) || '/';

      if (currentPath !== rootRoute && rootRoute) {
        targetRoute = rootRoute;
        usedRootFallback = true;
      }
    }

    if (!targetRoute) {
      // 5. Priority 6: No previous navigation level -> do nothing
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const performNavigation = () => {
      if (usedRootFallback) {
        historyStackRef.current = [targetRoute];
      } else if (nextStackLength < stack.length) {
        historyStackRef.current = stack.slice(0, nextStackLength);
      }
      navigate(targetRoute);
    };

    const activeDirtyGuard = dirtyGuardsRef.current.find((g) => {
      const val = g.isDirtyRef.current;
      return typeof val === 'function' ? Boolean(val()) : Boolean(val);
    });

    if (activeDirtyGuard && ConfirmDialogComponent) {
      const opts = activeDirtyGuard.optionsRef.current || {};
      setUnsavedPrompt({
        title: opts.title || 'Leave page with unsaved changes?',
        message: opts.message || 'You have unsaved changes on this page. Leaving now will discard them.',
        confirmLabel: opts.confirmLabel || 'Leave Page',
        cancelLabel: opts.cancelLabel || 'Stay',
        onConfirm: () => {
          setUnsavedPrompt(null);
          performNavigation();
        },
      });
      return;
    }

    performNavigation();
  }, [location.pathname, navigate, user, ConfirmDialogComponent]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const value = {
    registerHandler,
    registerDirtyGuard,
    registerParentModuleNavigator,
  };

  return (
    <EscNavigationContext.Provider value={value}>
      {children}
      {unsavedPrompt && ConfirmDialogComponent && (
        <ConfirmDialogComponent
          open={true}
          variant="warning"
          title={unsavedPrompt.title}
          message={unsavedPrompt.message}
          confirmLabel={unsavedPrompt.confirmLabel}
          cancelLabel={unsavedPrompt.cancelLabel}
          onConfirm={unsavedPrompt.onConfirm}
          onCancel={() => setUnsavedPrompt(null)}
        />
      )}
    </EscNavigationContext.Provider>
  );
}

export function useEscNavigationContext() {
  return useContext(EscNavigationContext);
}

/**
 * Hook to register an ESC key action with specific priority.
 *
 * @param {object} options
 * @param {number} options.priority ESC_PRIORITY (110 = Confirm, 100 = Dropdown, 80 = Modal, 60 = Nested Screen, etc.)
 * @param {Function} options.onEsc Callback when ESC is triggered
 * @param {boolean} [options.enabled=true] Whether this handler is currently active
 * @param {boolean|Function} [options.hasUnsavedChanges=false] Whether to ask confirmation before closing/backing out
 * @param {string} [options.confirmTitle] Optional confirmation modal title
 * @param {string} [options.confirmMessage] Optional confirmation modal body
 * @param {string} [options.confirmLabel] Optional confirmation modal accept button text
 * @param {string} [options.cancelLabel] Optional confirmation modal cancel button text
 */
export function useEscNavigation({
  priority = ESC_PRIORITY.MODAL,
  onEsc,
  enabled = true,
  hasUnsavedChanges = false,
  confirmTitle,
  confirmMessage,
  confirmLabel,
  cancelLabel,
}) {
  const { registerHandler } = useEscNavigationContext();
  const onEscRef = useRef(onEsc);
  const dirtyRef = useRef(hasUnsavedChanges);
  const optionsRef = useRef({ confirmTitle, confirmMessage, confirmLabel, cancelLabel });

  useEffect(() => {
    onEscRef.current = onEsc;
  }, [onEsc]);

  useEffect(() => {
    dirtyRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    optionsRef.current = { confirmTitle, confirmMessage, confirmLabel, cancelLabel };
  }, [confirmTitle, confirmMessage, confirmLabel, cancelLabel]);

  useEffect(() => {
    if (!enabled) return;

    const unregister = registerHandler({
      priority,
      enabled,
      handler: () => onEscRef.current?.(),
      hasUnsavedChanges: () => (
        typeof dirtyRef.current === 'function' ? Boolean(dirtyRef.current()) : Boolean(dirtyRef.current)
      ),
      getConfirmOptions: () => optionsRef.current,
    });

    return () => unregister();
  }, [registerHandler, priority, enabled]);
}

/**
 * Guard route-level ESC navigation when an inline form or workspace has unsaved edits.
 *
 * @param {boolean|Function} isDirty
 * @param {object} [options]
 */
export function useUnsavedChangesGuard(isDirty, options = {}) {
  const { registerDirtyGuard } = useEscNavigationContext();
  const isDirtyRef = useRef(isDirty);
  const optionsRef = useRef(options);
  const enabled = options.enabled !== false;

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!enabled) return;
    return registerDirtyGuard(isDirtyRef, optionsRef);
  }, [registerDirtyGuard, enabled]);
}

