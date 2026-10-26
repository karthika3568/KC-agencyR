import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  ScanBarcode,
  Plus,
  UserPlus,
  User,
  Minus,
  Trash2,
  Barcode,
  Camera,
  PackageX,
  Zap,
  QrCode,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Pencil,
  FileText,
  Package,
  X,
  Check,
  Pause,
} from 'lucide-react';
import { itemsApi, stockUnitsApi, categoriesApi } from '../api/catalog';
import { customersApi } from '../api/parties';
import { invoicesApi } from '../api/invoices';
import { stockHubApi, customerPrebookingsApi } from '../api/purchasing';
import { settingsApi } from '../api/admin';
import { useBranchStore } from '../store/branchStore';
import { usePermission } from '../hooks/usePermission';
import { priceLine, computeCartTotals, resolveSellingPrice } from '../utils/pricing';
import { Badge } from '../components/Badge.jsx';
import { Card } from '../components/Card.jsx';
import { Button } from '../components/Button.jsx';
import { PrintPreviewModal } from '../components/PrintPreviewModal.jsx';
import { ImageSearchModal } from '../components/ImageSearchModal.jsx';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal.jsx';
import { QuickSaleModal } from '../components/QuickSaleModal.jsx';

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'upi', label: 'UPI' },
  { key: 'card', label: 'Card' },
  { key: 'credit', label: 'Credit' },
  { key: 'other', label: 'Other' },
];

function newLine(item, priceType = 'normal') {
  return {
    key: `${item.id}-${Date.now()}-${Math.random()}`,
    item,
    qty: 1,
    free_qty: 0,
    discount_percent: '',
    discount_amount: '',
    discount_mode: 'amount',
    unit_id: item.base_unit_id,
    rate: resolveSellingPrice(item, item.base_unit_id, priceType).rate,
  };
}

function taxBadge(item, billType = 'gst') {
  const pct = billType === 'non_gst' ? 0 : Number(item.gst_percent || 0);
  return pct > 0 ? (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
      GST {pct}%
    </span>
  ) : (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">
      Non-GST
    </span>
  );
}

export function POS() {
  const queryClient = useQueryClient();
  const canGst = usePermission('pos.gst_billing');
  const canNonGst = usePermission('pos.non_gst_billing');
  const canDiscount = usePermission('pos.apply_discount');
  const canEditPrice = usePermission('pos.edit_price_at_sale');
  const canVoidHold = usePermission('pos.void_hold_bill');
  const canViewStock = usePermission('inventory.view_stock');

  const [billType, setBillType] = useState(canGst ? 'gst' : 'non_gst');
  const [billingFormat, setBillingFormat] = useState('local');
  const [priceType, setPriceType] = useState('normal');
  const [customerId, setCustomerId] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const prebookingId = searchParams.get('prebooking_id');
  const [linkedPrebooking, setLinkedPrebooking] = useState(null);
  const [isQuickSale, setIsQuickSale] = useState(false);
  const [vehicleNo, setVehicleNo] = useState('');
  const [cart, setCart] = useState([]);
  const [billDiscount, setBillDiscount] = useState('');
  const [billDiscountMode, setBillDiscountMode] = useState('amount');

  // Customer search & dropdown state
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSelectedIndex, setCustomerSelectedIndex] = useState(0);

  // Product search & dropdown state
  const [search, setSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productSelectedIndex, setProductSelectedIndex] = useState(0);

  // Rate editing row toggle
  const [editingRateKey, setEditingRateKey] = useState(null);

  const [heldId, setHeldId] = useState(null);
  const [showHeldList, setShowHeldList] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [payments, setPayments] = useState([{ payment_method: 'credit', amount: 0, reference_no: '' }]);
  const [message, setMessage] = useState('');
  const [printingInvoiceId, setPrintingInvoiceId] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showQuickSaleModal, setShowQuickSaleModal] = useState(false);

  const customerSearchInputRef = useRef(null);
  const productSearchInputRef = useRef(null);
  const customerDropdownRef = useRef(null);
  const productDropdownRef = useRef(null);
  const proceedBtnRef = useRef(null);
  const holdBillBtnRef = useRef(null);
  const clearCartBtnRef = useRef(null);

  const [scanError, setScanError] = useState('');
  const [isScannerReady, setIsScannerReady] = useState(false);
  const scanErrorTimeoutRef = useRef(null);
  const lastScanRef = useRef({ code: '', time: 0 });

  const showScanError = (msg) => {
    setIsScannerReady(false);
    setScanError(msg);
    if (scanErrorTimeoutRef.current) clearTimeout(scanErrorTimeoutRef.current);
    scanErrorTimeoutRef.current = setTimeout(() => {
      setScanError('');
    }, 3000);
  };

  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });
  const unitsQuery = useQuery({ queryKey: ['stock-units'], queryFn: stockUnitsApi.list });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const heldQuery = useQuery({ queryKey: ['invoices', 'held'], queryFn: () => invoicesApi.list('held') });
  const stockQuery = useQuery({
    queryKey: ['stock-hub', 'branch', selectedBranchId],
    queryFn: () => stockHubApi.list({ owner_type: 'branch', owner_id: selectedBranchId }),
    enabled: canViewStock && !!selectedBranchId,
  });
  const freeQtyQuery = useQuery({ queryKey: ['settings-free-qty'], queryFn: settingsApi.getFreeQty });

  const items = useMemo(() => (Array.isArray(itemsQuery.data) ? itemsQuery.data : (itemsQuery.data?.items || [])), [itemsQuery.data]);
  const customers = useMemo(() => customersQuery.data || [], [customersQuery.data]);
  const units = unitsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const heldInvoices = heldQuery.data || [];

  const selectedCustomer = useMemo(() => customers.find((c) => String(c.id) === String(customerId)), [customers, customerId]);

  // Focus Customer Search on initial page load as requested (default cursor in customer field, dropdown closed until search/arrow)
  useEffect(() => {
    customerSearchInputRef.current?.focus();
    setShowCustomerDropdown(false);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target) && customerSearchInputRef.current !== event.target) {
        setShowCustomerDropdown(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target) && productSearchInputRef.current !== event.target) {
        setShowProductDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      setBillingFormat(Number(selectedCustomer.is_local_customer) === 1 ? 'local' : 'outstation');
    }
  }, [selectedCustomer]);

  // Selecting a customer auto-applies their configured pricing type
  useEffect(() => {
    if (selectedCustomer?.pricing_type) {
      setPriceType(selectedCustomer.pricing_type);
    }
  }, [selectedCustomer]);

  const isLocalBilling = billingFormat === 'local';
  const allowLocalFree = freeQtyQuery.data ? Number(freeQtyQuery.data.allow_local_free_qty) === 1 : true;
  const allowDistanceFree = freeQtyQuery.data ? Number(freeQtyQuery.data.allow_distance_free_qty) === 1 : false;
  const isFreeQtyAllowed = isLocalBilling ? allowLocalFree : allowDistanceFree;

  // Load customer pre-booking directly into cart when opened from Order Management
  useEffect(() => {
    if (!prebookingId || items.length === 0) return;
    let active = true;
    customerPrebookingsApi.get(prebookingId).then((booking) => {
      if (!active || !booking) return;
      setLinkedPrebooking(booking);
      setCustomerId(String(booking.customer_id || ''));
      setIsQuickSale(false);
      if (booking.items && booking.items.length > 0) {
        const lines = booking.items.map((it) => {
          const itemMaster = items.find((i) => i.id === it.item_id) || {
            id: it.item_id,
            item_name: it.item_name,
            retail_price: it.rate,
            gst_percent: it.tax_percent,
            cess_percent: 0,
            base_unit_id: it.unit_id || 1,
          };
          return {
            key: `${it.item_id}-${Date.now()}-${Math.random()}`,
            item: itemMaster,
            qty: Number(it.qty),
            free_qty: 0,
            discount_percent: '',
            discount_amount: '',
            discount_mode: 'amount',
            unit_id: it.unit_id || itemMaster.base_unit_id,
            rate: Number(it.rate),
          };
        });
        setCart(lines);
        setMessage(`Loaded Pre-Booking #${booking.prebooking_no} for ${booking.customer_name}`);
        setTimeout(() => setMessage(''), 4000);
      }
    }).catch((err) => {
      console.error('Failed to load prebooking into POS', err);
    });
    return () => { active = false; };
  }, [prebookingId, items]);

  useEffect(() => {
    if (!isFreeQtyAllowed) {
      setCart((prev) => {
        if (prev.some((l) => Number(l.free_qty) > 0)) {
          return prev.map((l) => ({ ...l, free_qty: 0 }));
        }
        return prev;
      });
    }
  }, [isFreeQtyAllowed]);

  const stockByItemId = useMemo(() => {
    const map = {};
    const rows = Array.isArray(stockQuery.data) ? stockQuery.data : [];
    for (const row of rows) {
      if (row && row.item_id !== undefined) map[row.item_id] = row.quantity_on_hand;
    }
    return map;
  }, [stockQuery.data]);

  const getItemStock = (item) => {
    if (!item) return 0;
    const rawStock = stockByItemId[item.id] !== undefined ? stockByItemId[item.id] : item.quantity_on_hand;
    const parsedStock = Number(rawStock);
    return Number.isFinite(parsedStock) ? parsedStock : 0;
  };

  const activeCategories = useMemo(
    () => categories.filter((c) => c.is_active === undefined || c.is_active === null || Number(c.is_active) === 1),
    [categories]
  );

  const activeCategoryIds = useMemo(
    () => new Set(activeCategories.map((c) => String(c.id))),
    [activeCategories]
  );

  const activeItems = useMemo(() => {
    return items.filter((i) => {
      const isItemActive = i.is_active === undefined || i.is_active === null || Number(i.is_active) === 1;
      const isCatActive = !i.category_id || activeCategoryIds.has(String(i.category_id));
      return isItemActive && isCatActive;
    });
  }, [items, activeCategoryIds]);

  // Filtered customer list for Customer Selection
  const displayedCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((c) => {
      const name = (c.ledger_name || c.name || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const addr = (c.address || '').toLowerCase();
      const code = `c${String(c.id).padStart(3, '0')}`.toLowerCase();
      return name.includes(term) || phone.includes(term) || addr.includes(term) || code.includes(term);
    });
  }, [customers, customerSearch]);

  useEffect(() => {
    setCustomerSelectedIndex((prev) => {
      if (displayedCustomers.length === 0) return 0;
      return Math.min(prev, displayedCustomers.length - 1);
    });
  }, [displayedCustomers]);

  // Filtered product list for Product Selection
  const displayedProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return activeItems;
    return activeItems.filter((i) => {
      const name = (i.item_name || '').toLowerCase();
      const code = (i.item_code || `p${String(i.id).padStart(3, '0')}`).toLowerCase();
      const barcode = (i.barcode || '').toLowerCase();
      return name.includes(term) || code.includes(term) || barcode.includes(term);
    });
  }, [activeItems, search]);

  useEffect(() => {
    setProductSelectedIndex((prev) => {
      if (displayedProducts.length === 0) return 0;
      return Math.min(prev, displayedProducts.length - 1);
    });
  }, [displayedProducts]);

  const pricedLines = useMemo(
    () =>
      cart.map((line) => {
        if (!line.item) {
          const qty = Number(line.qty || 0);
          const rate = Number(line.rate || 0);
          const gross = Math.round(qty * rate * 100) / 100;
          const inputPercent = Number(line.discount_percent || 0);
          const inputAmount = Number(line.discount_amount || 0);
          const cleanPercent = Math.min(100, Math.max(0, isNaN(inputPercent) ? 0 : inputPercent));
          const cleanAmount = Math.max(0, isNaN(inputAmount) ? 0 : inputAmount);
          const percentDisc = gross > 0 && cleanPercent > 0 ? Math.round(((gross * cleanPercent) / 100) * 100) / 100 : 0;
          const directAmountDisc = cleanAmount > 0 ? cleanAmount : 0;
          const effectiveDiscount = Math.min(gross, Math.round((percentDisc + directAmountDisc) * 100) / 100);
          const taxable = Math.max(0, Math.round((gross - effectiveDiscount) * 100) / 100);
          return {
            ...line,
            gross,
            discount_amount: cleanAmount,
            discount_percent: cleanPercent,
            effective_discount: effectiveDiscount,
            tax_percent: 0,
            cess_percent: 0,
            tax_amount: 0,
            cess_amount: 0,
            line_total: taxable,
            priced: {
              qty,
              free_qty: 0,
              rate,
              mrp: rate,
              discount_percent: cleanPercent,
              discount_amount: cleanAmount,
              effective_discount: effectiveDiscount,
              tax_percent: 0,
              tax_amount: 0,
              cess_percent: 0,
              cess_amount: 0,
              line_total: taxable,
              gross,
              price_configured: true,
            },
          };
        }
        const priced = priceLine(
          line.item,
          line,
          billType,
          priceType
        );
        return {
          ...line,
          priced,
          gross: priced.gross,
          discount_amount: priced.discount_amount,
          discount_percent: priced.discount_percent,
          effective_discount: priced.effective_discount,
          tax_percent: priced.tax_percent,
          cess_percent: priced.cess_percent,
          tax_amount: priced.tax_amount,
          cess_amount: priced.cess_amount,
          line_total: priced.line_total,
        };
      }),
    [cart, billType, priceType]
  );

  const totals = useMemo(
    () => computeCartTotals(pricedLines, { amount: billDiscount, mode: billDiscountMode }),
    [pricedLines, billDiscount, billDiscountMode]
  );

  const uniformTaxPercent = pricedLines.length > 0 && pricedLines.every((l) => l.priced.tax_percent === pricedLines[0].priced.tax_percent)
    ? pricedLines[0].priced.tax_percent
    : null;

  const cartValidation = useMemo(() => {
    const consumptionByItem = {};
    const invalidLines = [];

    for (const line of cart) {
      const q = Number(line.qty);
      if (isNaN(q) || q <= 0) {
        invalidLines.push({
          key: line.key,
          name: line.item?.item_name || line.name || line.item_name_snapshot || 'Item',
          reason: `"${line.item?.item_name || line.name || line.item_name_snapshot || 'Item'}" has invalid quantity (must be > 0)`,
        });
        continue;
      }
      if (line.item) {
        const itemId = line.item.id;
        const free = isFreeQtyAllowed ? Number(line.free_qty) || 0 : 0;
        consumptionByItem[itemId] = (consumptionByItem[itemId] || 0) + q + free;
      }
    }

    for (const [itemId, totalQty] of Object.entries(consumptionByItem)) {
      const item = items.find((i) => i.id === Number(itemId));
      const stock = getItemStock(item);
      if (totalQty > stock) {
        invalidLines.push({
          itemId: Number(itemId),
          name: item?.item_name || `Item #${itemId}`,
          requested: totalQty,
          available: stock,
          reason: `"${item?.item_name || 'Item'}" requested quantity (${totalQty}) exceeds available stock (${stock})`,
        });
      }
    }

    return {
      isValid: invalidLines.length === 0,
      errors: invalidLines,
    };
  }, [cart, stockByItemId, isFreeQtyAllowed, items]);

  useEffect(() => {
    if (!splitMode) {
      setPayments((prev) => [{ ...prev[0], amount: totals.grandTotal }]);
    }
  }, [totals.grandTotal, splitMode]);

  const selectCustomer = (customer) => {
    if (!customer) {
      setCustomerId('');
      setCustomerSearch('');
      setIsQuickSale(false);
      setShowCustomerDropdown(false);
      return;
    }
    setCustomerId(String(customer.id));
    setCustomerSearch(customer.ledger_name || customer.name || '');
    setIsQuickSale(false);
    setShowCustomerDropdown(false);
    // Shift focus to product search field
    setTimeout(() => {
      productSearchInputRef.current?.focus();
      productSearchInputRef.current?.select();
      setShowProductDropdown(false);
    }, 50);
  };

  const addItem = (item) => {
    if (!item) return false;
    const stock = getItemStock(item);
    if (stock <= 0) {
      showScanError(`"${item.item_name}" is out of stock`);
      return false;
    }
    const currentQtyInCart = cart
      .filter((l) => l.item?.id === item.id)
      .reduce((sum, l) => sum + (Number(l.qty) || 0) + (isFreeQtyAllowed ? Number(l.free_qty) || 0 : 0), 0);
    if (currentQtyInCart >= stock) {
      showScanError(`"${item.item_name}" reached available stock limit (${stock})`);
      return false;
    }
    setCart((prev) => {
      const ex = prev.find((l) => l.item?.id === item.id && l.unit_id === item.base_unit_id);
      if (ex) {
        return prev.map((l) => (l.key === ex.key ? { ...l, qty: Number(l.qty) + 1 } : l));
      }
      return [...prev, newLine(item, priceType)];
    });
    setSearch('');
    if (productSearchInputRef.current) productSearchInputRef.current.value = '';
    setScanError('');
    setIsScannerReady(false);
    setShowProductDropdown(false);
    productSearchInputRef.current?.focus();
    return true;
  };

  const processScanOrSearch = (rawCode) => {
    const term = (rawCode !== undefined ? String(rawCode) : (productSearchInputRef.current?.value || search)).trim();
    if (!term) return;

    const now = Date.now();
    if (lastScanRef.current.code === term && now - lastScanRef.current.time < 400) {
      return;
    }
    lastScanRef.current = { code: term, time: now };

    const lowerTerm = term.toLowerCase();

    // 1. Exact match by barcode
    let matched = items.find((i) => (i.barcode || '').trim().toLowerCase() === lowerTerm);

    // 2. Exact match by item_code
    if (!matched) {
      matched = items.find((i) => (i.item_code || '').trim().toLowerCase() === lowerTerm);
    }

    // 3. Highlighted selection or single match fallback
    if (!matched) {
      if (productSelectedIndex >= 0 && productSelectedIndex < displayedProducts.length) {
        matched = displayedProducts[productSelectedIndex];
      } else if (displayedProducts.length === 1) {
        matched = displayedProducts[0];
      }
    }

    if (!matched) {
      showScanError('Product not found');
      setSearch('');
      if (productSearchInputRef.current) productSearchInputRef.current.value = '';
      productSearchInputRef.current?.focus();
      return;
    }

    addItem(matched);
  };

  const handleBarcodeScanned = (rawCode) => {
    const term = String(rawCode || '').trim();
    if (!term) return { success: false, reason: 'empty', message: 'No barcode entered' };

    const lowerTerm = term.toLowerCase();
    let matched = items.find((i) => (i.barcode || '').trim().toLowerCase() === lowerTerm);
    if (!matched) {
      matched = items.find((i) => (i.item_code || '').trim().toLowerCase() === lowerTerm);
    }

    if (!matched) {
      return { success: false, reason: 'not_found', code: term, message: `Product not found for "${term}"` };
    }

    const stock = getItemStock(matched);
    if (stock <= 0) {
      return { success: false, reason: 'out_of_stock', item: matched, message: `"${matched.item_name}" is out of stock` };
    }

    const currentQtyInCart = cart
      .filter((l) => l.item?.id === matched.id)
      .reduce((sum, l) => sum + (Number(l.qty) || 0) + (isFreeQtyAllowed ? Number(l.free_qty) || 0 : 0), 0);
    if (currentQtyInCart >= stock) {
      return {
        success: false,
        reason: 'out_of_stock',
        item: matched,
        message: `"${matched.item_name}" reached available stock limit (${stock})`,
      };
    }

    const added = addItem(matched);
    if (!added) {
      return { success: false, reason: 'out_of_stock', item: matched, message: `"${matched.item_name}" is out of stock` };
    }

    const priceInfo = resolveSellingPrice(matched, matched.base_unit_id, priceType);
    return {
      success: true,
      item: matched,
      message: `Added: ${matched.item_name} (Rs. ${priceInfo.rate.toFixed(2)})`,
    };
  };

  // Auto-scroll dropdown active row into view when customerSelectedIndex changes
  useEffect(() => {
    if (showCustomerDropdown && customerDropdownRef.current) {
      const rows = customerDropdownRef.current.querySelectorAll('tbody tr');
      if (rows && rows[customerSelectedIndex]) {
        rows[customerSelectedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [customerSelectedIndex, showCustomerDropdown]);

  // Auto-scroll dropdown active row into view when productSelectedIndex changes
  useEffect(() => {
    if (showProductDropdown && productDropdownRef.current) {
      const rows = productDropdownRef.current.querySelectorAll('tbody tr');
      if (rows && rows[productSelectedIndex]) {
        rows[productSelectedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [productSelectedIndex, showProductDropdown]);

  // Keyboard navigation for Customer Search input
  const handleCustomerKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showCustomerDropdown) {
        setShowCustomerDropdown(true);
        setCustomerSelectedIndex(0);
        return;
      }
      if (displayedCustomers.length > 0) {
        setCustomerSelectedIndex((prev) => Math.min(prev + 1, displayedCustomers.length - 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!showCustomerDropdown) {
        setShowCustomerDropdown(true);
        setCustomerSelectedIndex(Math.max(0, displayedCustomers.length - 1));
        return;
      }
      if (displayedCustomers.length > 0) {
        setCustomerSelectedIndex((prev) => Math.max(prev - 1, 0));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showCustomerDropdown && displayedCustomers.length > 0 && customerSelectedIndex >= 0 && customerSelectedIndex < displayedCustomers.length) {
        selectCustomer(displayedCustomers[customerSelectedIndex]);
      } else {
        // Walk-in customer: shift focus to product search without opening dropdown
        setShowCustomerDropdown(false);
        productSearchInputRef.current?.focus();
        productSearchInputRef.current?.select();
        setShowProductDropdown(false);
      }
    } else if (e.key === 'Tab') {
      setShowCustomerDropdown(false);
    } else if (e.key === 'Escape') {
      setShowCustomerDropdown(false);
    }
  };

  // Keyboard navigation for Product Search input
  const handleProductKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showProductDropdown) {
        setShowProductDropdown(true);
        setProductSelectedIndex(0);
        return;
      }
      if (displayedProducts.length > 0) {
        setProductSelectedIndex((prev) => Math.min(prev + 1, displayedProducts.length - 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!showProductDropdown) {
        setShowProductDropdown(true);
        setProductSelectedIndex(Math.max(0, displayedProducts.length - 1));
        return;
      }
      if (displayedProducts.length > 0) {
        setProductSelectedIndex((prev) => Math.max(prev - 1, 0));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const currentVal = (productSearchInputRef.current?.value || search).trim();
      if (showProductDropdown && displayedProducts.length > 0 && productSelectedIndex >= 0 && productSelectedIndex < displayedProducts.length) {
        addItem(displayedProducts[productSelectedIndex]);
      } else if (currentVal) {
        processScanOrSearch(currentVal);
      } else if (pricedLines.length > 0) {
        setShowProductDropdown(false);
        focusBillCell(0, 'qty');
      }
    } else if (e.key === 'Tab') {
      setShowProductDropdown(false);
      if (pricedLines.length > 0) {
        focusBillCell(0, 'qty');
      }
    } else if (e.key === 'Escape') {
      setSearch('');
      setShowProductDropdown(false);
      if (productSearchInputRef.current) productSearchInputRef.current.value = '';
    }
  };

  // 4-Way Arrow Key Navigation + Enter in Bill Items Table
  const getRowFieldList = () => {
    const list = ['rate', 'qty', 'discount_amount', 'discount_percent'];
    if (isFreeQtyAllowed) list.push('free_qty');
    return list;
  };

  const focusBillCell = (rowIndex, fieldKey) => {
    setTimeout(() => {
      const el = document.getElementById(`bill-cell-${rowIndex}-${fieldKey}`);
      if (el) {
        el.focus();
        try {
          el.select?.();
        } catch {
          // ignore
        }
      }
    }, 10);
  };

  const handleCellKeyDown = (e, rowIndex, fieldKey) => {
    const fields = getRowFieldList();
    const colIndex = fields.indexOf(fieldKey);
    const input = e.currentTarget;
    const val = input.value || '';

    let isStart = true;
    let isEnd = true;
    let isAllSelected = false;
    try {
      if (input.selectionStart !== null && input.selectionStart !== undefined) {
        isStart = input.selectionStart === 0;
        isEnd = input.selectionEnd === val.length;
        isAllSelected = input.selectionStart === 0 && input.selectionEnd === val.length;
      }
    } catch {
      isStart = true;
      isEnd = true;
      isAllSelected = true;
    }

    if (e.key === 'ArrowRight') {
      if (isEnd || isAllSelected) {
        e.preventDefault();
        if (colIndex < fields.length - 1) {
          focusBillCell(rowIndex, fields[colIndex + 1]);
        } else if (rowIndex < pricedLines.length - 1) {
          focusBillCell(rowIndex + 1, 'qty');
        } else {
          proceedBtnRef.current?.focus();
        }
      }
    } else if (e.key === 'ArrowLeft') {
      if (isStart || isAllSelected) {
        e.preventDefault();
        if (colIndex > 0) {
          focusBillCell(rowIndex, fields[colIndex - 1]);
        } else if (rowIndex > 0) {
          focusBillCell(rowIndex - 1, fields[fields.length - 1]);
        } else {
          productSearchInputRef.current?.focus();
          productSearchInputRef.current?.select();
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex < pricedLines.length - 1) {
        focusBillCell(rowIndex + 1, fieldKey);
      } else {
        proceedBtnRef.current?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) {
        focusBillCell(rowIndex - 1, fieldKey);
      } else {
        productSearchInputRef.current?.focus();
        productSearchInputRef.current?.select();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (fieldKey === 'rate') {
        focusBillCell(rowIndex, 'qty');
      } else if (colIndex < fields.length - 1) {
        focusBillCell(rowIndex, fields[colIndex + 1]);
      } else if (rowIndex < pricedLines.length - 1) {
        focusBillCell(rowIndex + 1, 'qty');
      } else {
        proceedBtnRef.current?.focus();
      }
    } else if (e.key === 'Escape') {
      productSearchInputRef.current?.focus();
      productSearchInputRef.current?.select();
    }
  };

  // Global F6 Shortcut: Proceed to Payment / Complete Sale
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F6' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's')) {
        e.preventDefault();
        if (showPaymentModal) {
          completeMutation.mutate();
          return;
        }
        if (cart.length > 0) {
          handleProceedToPayment();
        } else {
          setMessage('Bill is empty. Scan or search products to begin.');
          setTimeout(() => setMessage(''), 3000);
        }
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart, showPaymentModal]);

  const updateLine = (key, patch) => setCart((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const changePriceType = (nextType) => {
    setPriceType(nextType);
    setCart((prev) => prev.map((line) => (line.item ? { ...line, rate: resolveSellingPrice(line.item, line.unit_id, nextType).rate } : line)));
  };

  const removeLine = (key) => setCart((prev) => prev.filter((l) => l.key !== key));

  const bumpQty = (line, delta) => {
    if (!line.item) {
      const next = Number(line.qty) + delta;
      if (next < 1) return;
      updateLine(line.key, { qty: next });
      return;
    }
    const stock = getItemStock(line.item);
    const free = isFreeQtyAllowed ? Number(line.free_qty || 0) : 0;
    const otherQty = cart
      .filter((l) => l.key !== line.key && l.item?.id === line.item.id)
      .reduce((sum, l) => sum + (Number(l.qty) || 0) + (isFreeQtyAllowed ? Number(l.free_qty) || 0 : 0), 0);
    const maxQtyForLine = Math.max(0, stock - otherQty - free);
    const next = Number(line.qty) + delta;
    if (next < 1) return;
    if (delta > 0 && next > maxQtyForLine) {
      showScanError(`Cannot increase. Stock limit is ${stock}.`);
      return;
    }
    updateLine(line.key, { qty: next });
  };

  const resetBill = () => {
    setCart([]);
    setCustomerId('');
    setCustomerSearch('');
    setSearch('');
    setIsQuickSale(false);
    setVehicleNo('');
    setHeldId(null);
    setBillDiscount('');
    setBillDiscountMode('amount');
    setPayments([{ payment_method: 'credit', amount: 0, reference_no: '' }]);
    setSplitMode(false);
    if (linkedPrebooking) {
      setLinkedPrebooking(null);
      searchParams.delete('prebooking_id');
      setSearchParams(searchParams);
    }
    setShowCustomerDropdown(true);
    customerSearchInputRef.current?.focus();
  };

  const handleProceedToPayment = () => {
    if (cart.length === 0) {
      setMessage('Bill is empty. Scan or search products to begin.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    if (!cartValidation.isValid) {
      const firstErr = cartValidation.errors[0]?.reason || 'Cart contains items exceeding available stock.';
      setMessage(`Cannot proceed: ${firstErr}`);
      setTimeout(() => setMessage(''), 4000);
      return;
    }
    if (!customerId || isQuickSale) {
      setPayments([{ payment_method: 'cash', amount: totals.grandTotal, reference_no: '' }]);
    } else {
      setPayments([{ payment_method: 'credit', amount: totals.grandTotal, reference_no: '' }]);
    }
    setShowPaymentModal(true);
  };

  const buildPayload = () => ({
    bill_type: billType,
    price_type: priceType,
    customer_id: customerId ? Number(customerId) : null,
    vehicle_no: vehicleNo || null,
    items: totals.updatedLines.map((l) => ({
      item_id: l.item ? l.item.id : null,
      item_name: l.item ? undefined : (l.item_name_snapshot || l.name),
      qty: Number(l.qty),
      free_qty: isFreeQtyAllowed ? Number(l.free_qty || 0) : 0,
      unit_id: l.unit_id || 1,
      ...(canDiscount
        ? {
            discount_amount: Math.round((Number(l.discount_amount || 0) + Number(l.bill_discount_share || 0)) * 100) / 100,
            discount_percent: Number(l.discount_percent ?? 0),
            discount_mode: 'amount',
          }
        : {}),
      ...(canEditPrice || !l.item ? { rate: Number(l.rate) } : {}),
    })),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      if (heldId) {
        return invoicesApi.update(heldId, payload);
      }
      const created = await invoicesApi.create(payload);
      setHeldId(created.id);
      return created;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'held'] });
      setMessage(`Bill #${data.id} placed on hold.`);
      setTimeout(() => setMessage(''), 4000);
      resetBill();
    },
  });

  const handleHoldBill = () => {
    if (cart.length === 0) {
      setMessage('Bill is empty. Nothing to hold.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    saveMutation.mutate();
  };

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!cartValidation.isValid) {
        throw new Error(cartValidation.errors[0]?.reason || 'Requested quantity exceeds available stock.');
      }
      const saved = heldId ? await invoicesApi.update(heldId, buildPayload()) : await invoicesApi.create(buildPayload());
      const id = saved.id;
      return invoicesApi.complete(id, payments.filter((p) => Number(p.amount) > 0));
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'held'] });
      queryClient.invalidateQueries({ queryKey: ['stock-hub'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      if (linkedPrebooking?.id) {
        try {
          await customerPrebookingsApi.linkInvoice(linkedPrebooking.id, { invoice_id: result.id });
          queryClient.invalidateQueries({ queryKey: ['customer-prebookings'] });
        } catch (e) {
          console.error('Failed to link invoice to prebooking', e);
        }
        setLinkedPrebooking(null);
        searchParams.delete('prebooking_id');
        setSearchParams(searchParams);
      }
      setShowPaymentModal(false);
      setPrintingInvoiceId(result.id);
      resetBill();
      setMessage(`Invoice ${result.invoice_no} completed.`);
      setTimeout(() => setMessage(''), 4000);
    },
  });

  const resumeHeld = async (invoiceId) => {
    const invoice = await invoicesApi.get(invoiceId);
    setHeldId(invoice.id);
    setBillType(invoice.bill_type);
    setPriceType(invoice.price_type || 'normal');
    setCustomerId(invoice.customer_id || '');
    setVehicleNo(invoice.vehicle_no || '');
    setCart(
      invoice.items.map((it) => {
        const lineGross = Number(it.qty) * Number(it.rate);
        const pctVal = Number(it.discount_percent || 0);
        const pctDisc = lineGross > 0 && pctVal > 0 ? Math.round(((lineGross * pctVal) / 100) * 100) / 100 : 0;
        const directAmt = Math.max(0, Math.round((Number(it.discount_amount || 0) - pctDisc) * 100) / 100);

        return {
          key: `${it.item_id || 'manual'}-${it.id}`,
          is_manual: !it.item_id,
          item: it.item_id
            ? {
                id: it.item_id,
                item_name: it.item_name_snapshot,
                retail_price: it.rate,
                gst_percent: it.tax_percent,
                cess_percent: 0,
                base_unit_id: it.unit_id,
              }
            : null,
          name: it.item_name_snapshot,
          qty: Number(it.qty),
          free_qty: Number(it.free_qty),
          discount_percent: pctVal > 0 ? pctVal : '',
          discount_amount: directAmt > 0 ? directAmt : '',
          unit_id: it.unit_id,
          rate: Number(it.rate),
        };
      })
    );
    setShowHeldList(false);
    setIsQuickSale(false);
  };

  const discardHeld = async (invoiceId) => {
    await invoicesApi.discard(invoiceId);
    queryClient.invalidateQueries({ queryKey: ['invoices', 'held'] });
    if (heldId === invoiceId) resetBill();
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-between overflow-y-auto lg:overflow-hidden gap-1.5 font-sans select-none text-ink pb-2 lg:pb-0">
      {/* 1. TOP CONTROLS BAR (GST / Non-GST & Normal / Retail / Wholesale) */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#E5E7F5] shadow-2xs shrink-0">
        {/* Left: GST Billing vs Non-GST / Estimate */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full bg-[#F7F5FF] p-0.5 border border-[#E5E7F5]">
            <button
              type="button"
              disabled={!canGst}
              onClick={() => setBillType('gst')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                billType === 'gst'
                  ? 'bg-[#6F2DA8] text-white shadow-soft'
                  : 'text-[#697797] hover:text-ink'
              } disabled:opacity-40`}
            >
              GST Billing
            </button>
            <button
              type="button"
              disabled={!canNonGst}
              onClick={() => setBillType('non_gst')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                billType === 'non_gst'
                  ? 'bg-[#6F2DA8] text-white shadow-soft'
                  : 'text-[#697797] hover:text-ink'
              } disabled:opacity-40`}
            >
              Non-GST / Estimate
            </button>
          </div>

          {/* Local vs Distance Billing Pill */}
          <div className="hidden sm:inline-flex rounded-full bg-[#F7F5FF] p-0.5 border border-[#E5E7F5]">
            <button
              type="button"
              onClick={() => setBillingFormat('local')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                billingFormat === 'local' ? 'bg-[#8244AD] text-white shadow-soft' : 'text-[#697797] hover:text-ink'
              }`}
            >
              Local
            </button>
            <button
              type="button"
              onClick={() => setBillingFormat('outstation')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                billingFormat === 'outstation' ? 'bg-[#8244AD] text-white shadow-soft' : 'text-[#697797] hover:text-ink'
              }`}
            >
              Distance
            </button>
          </div>

          {/* Hold Bills & Feedback messages */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowHeldList((v) => !v)}
              className="rounded-full text-xs py-0.5 px-2.5"
            >
              Hold Bills ({heldInvoices.length})
            </Button>
            {message && <span className="text-xs font-bold text-success animate-fade-in">{message}</span>}
          </div>
        </div>

        {/* Right: Pricing Type Pills */}
        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-full bg-[#F7F5FF] p-0.5 border border-[#E5E7F5]">
            {[
              { key: 'normal', label: 'Normal' },
              { key: 'retail', label: 'Retail' },
              { key: 'wholesale', label: 'Wholesale' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => changePriceType(opt.key)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  priceType === opt.key
                    ? 'bg-[#6F2DA8] text-white shadow-soft'
                    : 'text-[#697797] hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Held bills popup card */}
      {showHeldList && (
        <Card className="p-3 shadow-soft-lg border-[#E5E7F5] bg-white z-40">
          <div className="flex items-center justify-between pb-2 border-b border-border-soft mb-2">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">Held Bills</span>
            <button onClick={() => setShowHeldList(false)} className="text-ink-muted hover:text-ink text-xs">Close ✕</button>
          </div>
          {heldInvoices.length === 0 && <p className="text-xs text-ink-muted py-2">No held bills found.</p>}
          <div className="max-h-40 overflow-y-auto space-y-1.5">
            {heldInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-xl p-2 bg-[#F7F5FF] text-xs">
                <span>
                  <strong>#{inv.id}</strong> · {inv.bill_type.toUpperCase()} · {inv.customer_name || 'Walk-in'} · ₹{inv.grand_total}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => resumeHeld(inv.id)} className="font-bold text-[#6F2DA8] hover:underline">
                    Resume
                  </button>
                  {canVoidHold && (
                    <button onClick={() => discardHeld(inv.id)} className="font-bold text-danger hover:underline">
                      Discard
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 2. SIDE-BY-SIDE: Customer Selection (Left) & Product Selection (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 shrink-0">
        {/* ================= COLUMN 1: Customer Selection ================= */}
        <div className="relative rounded-2xl border border-[#E5E7F5] bg-white p-3 shadow-2xs">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-soft text-[#6F2DA8]">
                <User size={14} />
              </div>
              <h2 className="text-xs font-bold text-ink">Customer Selection</h2>
            </div>
            <Link
              to="/parties"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#6F2DA8] hover:bg-[#5C238C] text-white text-[11px] font-bold shadow-2xs transition-all active:scale-95"
              title="Add Customer"
            >
              <UserPlus size={13} />
              <span>Add Customer</span>
            </Link>
          </div>

          {/* Search field */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={14} />
            <input
              ref={customerSearchInputRef}
              type="text"
              autoFocus
              placeholder="Search customer by name, phone or code..."
              value={customerSearch}
              onFocus={() => {
                if (customerSearch.trim().length > 0) setShowCustomerDropdown(true);
              }}
              onChange={(e) => {
                const val = e.target.value;
                setCustomerSearch(val);
                setShowCustomerDropdown(val.trim().length > 0);
                setCustomerSelectedIndex(0);
              }}
              onKeyDown={handleCustomerKeyDown}
              className={`w-full rounded-xl border border-[#E5E7F5] bg-[#F7F5FF]/70 pl-9 pr-8 py-1.5 text-xs text-ink placeholder:text-[#94A3B8] transition-all focus:bg-white focus:border-[#6F2DA8] focus:outline-none focus:ring-2 focus:ring-[#6F2DA8]/15 ${
                selectedCustomer ? 'border-[#8244AD]/40 bg-[#EEE5FF]/30 font-semibold text-[#6F2DA8]' : ''
              }`}
            />
            {(customerSearch || customerId) && (
              <button
                type="button"
                onClick={() => {
                  setCustomerId('');
                  setCustomerSearch('');
                  setShowCustomerDropdown(true);
                  customerSearchInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-ink"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Customer Selection Dropdown Table (Shown only when focused or searching) */}
          {showCustomerDropdown && (
            <div
              ref={customerDropdownRef}
              className="absolute left-3 right-3 top-[calc(100%-4px)] z-40 rounded-xl border border-[#E5E7F5] bg-white shadow-soft-lg overflow-x-auto max-h-52 overflow-y-auto scrollbar-thin"
            >
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-[#F7F5FF] border-b border-[#E5E7F5] z-10">
                  <tr className="text-[#697797] font-bold text-[11px]">
                    <th className="py-1.5 px-3">Customer Name</th>
                    <th className="py-1.5 px-3">Phone</th>
                    <th className="py-1.5 px-3 text-right">Area / Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7F5]/50">
                  {displayedCustomers.map((c, index) => {
                    const isSelected = String(c.id) === String(customerId);
                    const isHighlighted = index === customerSelectedIndex;
                    const areaCode = `${c.address ? c.address.split(',')[0].trim() : 'Tenkasi'} / C${String(c.id).padStart(3, '0')}`;

                    return (
                      <tr
                        key={c.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectCustomer(c);
                        }}
                        onMouseMove={() => {
                          if (customerSelectedIndex !== index) setCustomerSelectedIndex(index);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isHighlighted
                            ? 'bg-[#6F2DA8] text-white font-bold shadow-2xs'
                            : isSelected
                            ? 'bg-[#EEE5FF] font-bold text-[#6F2DA8]'
                            : 'hover:bg-[#F7F5FF] text-ink'
                        }`}
                      >
                        <td className="py-2 px-3 flex items-center gap-2">
                          {isHighlighted ? (
                            <CheckCircle2 size={15} className="text-white shrink-0" />
                          ) : isSelected ? (
                            <CheckCircle2 size={15} className="text-[#6F2DA8] shrink-0" />
                          ) : (
                            <User size={15} className="text-[#94A3B8] shrink-0" />
                          )}
                          <span className="truncate">{c.ledger_name || c.name}</span>
                        </td>
                        <td className={`py-2 px-3 ${isHighlighted ? 'text-white/90' : 'text-[#697797]'}`}>{c.phone || '-'}</td>
                        <td className={`py-2 px-3 text-right font-mono ${isHighlighted ? 'text-white/90 font-bold' : 'text-[#697797]'}`}>{areaCode}</td>
                      </tr>
                    );
                  })}
                  {displayedCustomers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-ink-muted">
                        No matching customers found. Press Enter for Walk-in.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Selected Customer pill if customer is active and dropdown is closed */}
          {selectedCustomer && !showCustomerDropdown && (
            <div className="mt-1.5 flex items-center justify-between rounded-lg bg-[#EEE5FF] px-2.5 py-1 text-[11px] font-semibold text-[#6F2DA8]">
              <div className="flex items-center gap-1.5 truncate">
                <CheckCircle2 size={13} className="shrink-0" />
                <span className="truncate font-bold">{selectedCustomer.ledger_name || selectedCustomer.name}</span>
              </div>
              <span className="text-[#8244AD] font-mono shrink-0 ml-2">
                {selectedCustomer.phone || ''} · {selectedCustomer.address ? selectedCustomer.address.split(',')[0].trim() : 'Tenkasi'}
              </span>
            </div>
          )}
        </div>

        {/* ================= COLUMN 2: Product Selection ================= */}
        <div className="relative rounded-2xl border border-[#E5E7F5] bg-white p-3 shadow-2xs">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-soft text-[#6F2DA8]">
                <Package size={14} />
              </div>
              <h2 className="text-xs font-bold text-ink">Product Selection</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowImageSearch(true)}
                title="Camera"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#6F2DA8] hover:bg-[#5C238C] text-white text-[11px] font-bold shadow-2xs transition-all active:scale-95"
              >
                <Camera size={13} />
                <span>Camera</span>
              </button>
              <button
                type="button"
                onClick={() => setShowBarcodeScanner(true)}
                title="QR Scanner"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#6F2DA8] hover:bg-[#5C238C] text-white text-[11px] font-bold shadow-2xs transition-all active:scale-95"
              >
                <QrCode size={13} />
                <span>QR Scanner</span>
              </button>
            </div>
          </div>

          {/* Search field */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={14} />
            <input
              ref={productSearchInputRef}
              type="text"
              placeholder="Search product by name, code or barcode..."
              value={search}
              onFocus={() => {
                if (search.trim().length > 0) setShowProductDropdown(true);
              }}
              onChange={(e) => {
                const val = e.target.value;
                setSearch(val);
                setShowProductDropdown(val.trim().length > 0);
                setProductSelectedIndex(0);
                if (scanError) setScanError('');
              }}
              onKeyDown={handleProductKeyDown}
              className={`w-full rounded-xl border border-[#E5E7F5] bg-[#F7F5FF]/70 pl-9 pr-8 py-1.5 text-xs text-ink placeholder:text-[#94A3B8] transition-all focus:bg-white focus:border-[#6F2DA8] focus:outline-none focus:ring-2 focus:ring-[#6F2DA8]/15 ${
                scanError ? 'border-danger ring-1 ring-danger/30' : ''
              }`}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setShowProductDropdown(true);
                  productSearchInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-ink"
              >
                <X size={13} />
              </button>
            )}
            {scanError && (
              <div className="absolute left-0 top-full z-40 mt-1 flex items-center gap-1.5 rounded-xl border border-danger/40 bg-white px-3 py-1.5 text-xs font-bold text-danger shadow-soft">
                <PackageX size={14} className="shrink-0" />
                <span>{scanError}</span>
              </div>
            )}
          </div>

          {/* Product Selection Dropdown Table (Shown only when focused or searching) */}
          {showProductDropdown && (
            <div
              ref={productDropdownRef}
              className="absolute left-3 right-3 top-[calc(100%-4px)] z-40 rounded-xl border border-[#E5E7F5] bg-white shadow-soft-lg overflow-x-auto max-h-52 overflow-y-auto scrollbar-thin"
            >
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-[#F7F5FF] border-b border-[#E5E7F5] z-10">
                  <tr className="text-[#697797] font-bold text-[11px]">
                    <th className="py-1.5 px-3">Code</th>
                    <th className="py-1.5 px-3">Product Name</th>
                    <th className="py-1.5 px-3">MRP</th>
                    <th className="py-1.5 px-3">Rate</th>
                    <th className="py-1.5 px-3 text-right">Available Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7F5]/50">
                  {displayedProducts.map((item, index) => {
                    const stock = getItemStock(item);
                    const isHighlighted = index === productSelectedIndex;
                    const code = item.item_code || `P${String(item.id).padStart(3, '0')}`;
                    const sellingRate = resolveSellingPrice(item, item.base_unit_id, priceType).rate;
                    const mrp = Number(item.mrp || sellingRate).toFixed(2);

                    return (
                      <tr
                        key={item.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addItem(item);
                        }}
                        onMouseMove={() => {
                          if (productSelectedIndex !== index) setProductSelectedIndex(index);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isHighlighted
                            ? 'bg-[#6F2DA8] text-white font-bold shadow-2xs'
                            : 'hover:bg-[#F7F5FF] text-ink'
                        }`}
                      >
                        <td className={`py-2 px-3 font-mono ${isHighlighted ? 'text-white/90' : 'text-[#697797]'}`}>{code}</td>
                        <td className="py-2 px-3 font-medium">
                          <div className="flex items-center gap-1.5">
                            {isHighlighted && <Check size={14} className="text-white shrink-0" />}
                            <span className="truncate">{item.item_name}</span>
                          </div>
                        </td>
                        <td className={`py-2 px-3 ${isHighlighted ? 'text-white/90' : 'text-[#697797]'}`}>₹ {mrp}</td>
                        <td className={`py-2 px-3 font-semibold ${isHighlighted ? 'text-white' : ''}`}>₹ {Number(sellingRate).toFixed(2)}</td>
                        <td className="py-2 px-3 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isHighlighted
                                ? 'bg-white/20 text-white'
                                : stock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {stock}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {displayedProducts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-ink-muted">
                        No matching products found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 3. FULL-WIDTH BILL ITEMS TABLE */}
      <div className="flex-1 min-h-[260px] lg:min-h-0 rounded-2xl border border-[#E5E7F5] bg-white p-2.5 shadow-2xs flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-soft text-[#6F2DA8]">
              <FileText size={14} />
            </div>
            <h2 className="text-xs font-bold text-ink">Bill Items</h2>
            <span className="text-[11px] text-[#697797] font-semibold">
              ({pricedLines.length} item{pricedLines.length === 1 ? '' : 's'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetBill}
              disabled={cart.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-[#E5E7F5] text-[#697797] hover:text-danger hover:border-danger/30 hover:bg-rose-50 text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={12} />
              <span>Clear All</span>
            </button>
          </div>
        </div>

        {/* Linked Prebooking Banner */}
        {linkedPrebooking && (
          <div className="mb-2 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs text-emerald-800 shrink-0">
            <div className="flex items-center gap-2 font-medium">
              <span>Order linked:</span>
              <span className="font-mono font-bold">{linkedPrebooking.prebooking_no}</span>
              <span>· {linkedPrebooking.customer_name}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setLinkedPrebooking(null);
                searchParams.delete('prebooking_id');
                setSearchParams(searchParams);
              }}
              className="text-emerald-700 hover:text-danger font-bold text-xs"
            >
              Unlink ✕
            </button>
          </div>
        )}

        {/* Stock Validation Error Warning */}
        {!cartValidation.isValid && cart.length > 0 && (
          <div className="mb-2 rounded-xl border border-danger/30 bg-danger/5 p-2 text-xs text-danger font-medium flex items-center gap-2 shrink-0">
            <PackageX size={15} className="shrink-0" />
            <div>
              <span className="font-bold">Stock notice: </span>
              {cartValidation.errors[0]?.reason}
            </div>
          </div>
        )}

        {/* Internal Scrollable Table Container */}
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto scrollbar-thin rounded-xl border border-[#E5E7F5]">
          <table className="w-full text-xs text-left min-w-[900px]">
            <thead className="sticky top-0 bg-[#F7F5FF] border-b border-[#E5E7F5] z-10">
              <tr className="text-[#697797] font-bold text-[11px]">
                <th className="py-2 px-2 text-center w-10">#</th>
                <th className="py-2 px-3 w-20">Code</th>
                <th className="py-2 px-3 min-w-[180px]">Product Name</th>
                <th className="py-2 px-3 text-right w-24">MRP (₹)</th>
                <th className="py-2 px-3 text-right w-24">Rate (₹)</th>
                <th className="py-2 px-3 text-center w-24">Qty</th>
                <th className="py-2 px-3 text-center w-28">Discount ₹</th>
                <th className="py-2 px-3 text-center w-24">Discount %</th>
                <th className="py-2 px-3 text-center w-24">Free Qty</th>
                <th className="py-2 px-3 text-right w-28">Amount (₹)</th>
                <th className="py-2 px-3 text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7F5]">
              {pricedLines.map((line, idx) => {
                const code = line.item?.item_code || `P${String(line.item?.id || idx + 1).padStart(3, '0')}`;
                const name = line.item ? line.item.item_name : (line.name || line.item_name_snapshot);
                const mrp = Number(line.priced.mrp).toFixed(2);
                const rate = Number(line.rate).toFixed(2);
                const lineTotal = Number(line.priced.line_total).toFixed(2);

                return (
                  <tr key={line.key} className="hover:bg-[#FAF8FF] transition-colors">
                    {/* # Index */}
                    <td className="py-2 px-2 text-center text-[#697797] font-medium">{idx + 1}</td>

                    {/* Code */}
                    <td className="py-2 px-3 font-mono text-[#697797]">{code}</td>

                    {/* Product Name */}
                    <td className="py-2 px-3 font-semibold text-ink">
                      <div className="flex flex-col">
                        <span>{name}</span>
                        {line.item && (
                          <div className="mt-0.5 flex items-center gap-1.5">
                            {taxBadge(line.item, billType)}
                            {Number(line.free_qty) > 0 && isFreeQtyAllowed && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                Free: {line.free_qty}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* MRP */}
                    <td className="py-2 px-3 text-right text-[#697797]">{mrp}</td>

                    {/* Rate with 4-way arrow nav */}
                    <td className="py-2 px-3 text-right font-medium">
                      <input
                        id={`bill-cell-${idx}-rate`}
                        type="text"
                        inputMode="decimal"
                        value={line.rate ?? ''}
                        readOnly={!canEditPrice}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                            updateLine(line.key, { rate: val });
                          }
                        }}
                        onKeyDown={(e) => handleCellKeyDown(e, idx, 'rate')}
                        className={`w-16 rounded-lg border px-1.5 py-0.5 text-right text-xs font-semibold outline-none transition-all ${
                          canEditPrice
                            ? 'border-[#E5E7F5] bg-white text-ink focus:border-[#6F2DA8] focus:ring-1 focus:ring-[#6F2DA8]/20'
                            : 'border-transparent bg-transparent text-[#697797] cursor-default'
                        }`}
                      />
                    </td>

                    {/* Quantity with stepper & 4-way arrow nav */}
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center rounded-lg border border-[#E5E7F5] bg-white">
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => bumpQty(line, -1)}
                          disabled={Number(line.qty) <= 1}
                          className="px-1.5 py-0.5 text-[#697797] hover:text-ink disabled:opacity-30"
                        >
                          <Minus size={10} />
                        </button>
                        <input
                          id={`bill-cell-${idx}-qty`}
                          type="text"
                          inputMode="decimal"
                          value={line.qty ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                              updateLine(line.key, { qty: val });
                            }
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'qty')}
                          className="w-12 text-center py-0.5 text-xs font-bold text-ink bg-transparent focus:outline-none"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => bumpQty(line, 1)}
                          className="px-1.5 py-0.5 text-[#697797] hover:text-ink"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </td>

                    {/* Discount ₹ with 4-way arrow nav */}
                    <td className="py-2 px-3 text-center">
                      <input
                        id={`bill-cell-${idx}-discount_amount`}
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={line.discount_amount ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                            updateLine(line.key, { discount_amount: val });
                          }
                        }}
                        onKeyDown={(e) => handleCellKeyDown(e, idx, 'discount_amount')}
                        className="w-20 rounded-lg border border-[#E5E7F5] px-1.5 py-0.5 text-right text-xs font-semibold text-ink focus:border-[#6F2DA8] focus:ring-1 focus:ring-[#6F2DA8]/20 outline-none"
                      />
                    </td>

                    {/* Discount % with 4-way arrow nav */}
                    <td className="py-2 px-3 text-center">
                      <input
                        id={`bill-cell-${idx}-discount_percent`}
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={line.discount_percent ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                            const num = parseFloat(val);
                            if (val === '' || isNaN(num) || num <= 100) {
                              updateLine(line.key, { discount_percent: val });
                            }
                          }
                        }}
                        onKeyDown={(e) => handleCellKeyDown(e, idx, 'discount_percent')}
                        className="w-16 rounded-lg border border-[#E5E7F5] px-1.5 py-0.5 text-right text-xs font-semibold text-ink focus:border-[#6F2DA8] focus:ring-1 focus:ring-[#6F2DA8]/20 outline-none"
                      />
                    </td>

                    {/* Free Qty with 4-way arrow nav */}
                    <td className="py-2 px-3 text-center">
                      <input
                        id={`bill-cell-${idx}-free_qty`}
                        type="text"
                        inputMode="decimal"
                        disabled={!isFreeQtyAllowed}
                        value={line.free_qty ?? 0}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                            updateLine(line.key, { free_qty: val });
                          }
                        }}
                        onKeyDown={(e) => handleCellKeyDown(e, idx, 'free_qty')}
                        className="w-14 rounded-lg border border-[#E5E7F5] px-1 py-0.5 text-center text-xs text-ink disabled:bg-gray-50 disabled:opacity-50 focus:border-[#6F2DA8] outline-none"
                      />
                    </td>

                    {/* Line Amount */}
                    <td className="py-2 px-3 text-right font-bold text-ink">
                      {lineTotal}
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          title="Remove item"
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {pricedLines.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-[#697797]">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <PackageX size={24} className="text-[#94A3B8]" />
                      <p className="text-xs font-semibold">Bill is empty.</p>
                      <p className="text-[11px] text-[#94A3B8]">
                        Type product name or scan barcode to add items.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. BILLING SUMMARY ROW (5 Metric Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 shrink-0">
        {/* Card 1: Subtotal */}
        <div className="rounded-xl border border-[#E5E7F5] bg-white px-3 py-2 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#697797]">Subtotal</span>
          <span className="text-base sm:text-lg font-bold text-ink mt-0.5">
            ₹ {totals.subtotal.toFixed(2)}
          </span>
        </div>

        {/* Card 2: GST Total */}
        <div className="rounded-xl border border-[#E5E7F5] bg-white px-3 py-2 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#697797]">GST Total</span>
            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              GST {uniformTaxPercent ?? 12}%
            </span>
          </div>
          <span className="text-base sm:text-lg font-bold text-ink mt-0.5">
            ₹ {(totals.cgst + totals.sgst + totals.cessAmount).toFixed(2)}
          </span>
        </div>

        {/* Card 3: Discount */}
        <div className="rounded-xl border border-[#E5E7F5] bg-white px-3 py-2 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#697797]">Discount</span>
          <span className="text-base sm:text-lg font-bold text-ink mt-0.5">
            ₹ {totals.discountAmount.toFixed(2)}
          </span>
        </div>

        {/* Card 4: Rounding */}
        <div className="rounded-xl border border-[#E5E7F5] bg-white px-3 py-2 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#697797]">Rounding</span>
          <span className="text-base sm:text-lg font-bold text-ink mt-0.5">
            ₹ {totals.roundOff.toFixed(2)}
          </span>
        </div>

        {/* Card 5: Total Amount */}
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-[#D8CEE2] bg-[#EEE5FF] px-3 py-2 shadow-soft flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#6F2DA8]">Total Amount</span>
          <span className="text-lg sm:text-xl font-black text-[#351442] mt-0.5 truncate">
            ₹ {totals.grandTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 5. ACTION BUTTONS: Hold Bill (Left), Proceed to Payment (Center), Clear Cart (Right) */}
      <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-2 sm:gap-3 my-1 shrink-0 px-0.5">
        {/* Hold Bill */}
        <button
          ref={holdBillBtnRef}
          type="button"
          onClick={handleHoldBill}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              proceedBtnRef.current?.focus();
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (pricedLines.length > 0) {
                focusBillCell(pricedLines.length - 1, 'qty');
              } else {
                productSearchInputRef.current?.focus();
                productSearchInputRef.current?.select();
              }
            }
          }}
          disabled={cart.length === 0 || saveMutation.isPending}
          className="col-span-1 order-2 sm:order-1 flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2 rounded-xl border border-[#D8CEE2] bg-white hover:bg-[#F7F5FF] focus:bg-[#F7F5FF] focus:border-[#6F2DA8] focus:ring-2 focus:ring-[#6F2DA8]/30 text-[#6F2DA8] font-bold text-xs shadow-2xs transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer outline-none"
          title="Hold current bill (Left Arrow from Proceed)"
        >
          <Pause size={14} className="shrink-0" />
          <span className="truncate">{saveMutation.isPending ? 'Holding...' : 'Hold Bill'}</span>
        </button>

        {/* Proceed to Payment */}
        <button
          ref={proceedBtnRef}
          type="button"
          onClick={handleProceedToPayment}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              holdBillBtnRef.current?.focus();
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              clearCartBtnRef.current?.focus();
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (pricedLines.length > 0) {
                focusBillCell(pricedLines.length - 1, 'qty');
              } else {
                productSearchInputRef.current?.focus();
                productSearchInputRef.current?.select();
              }
            }
          }}
          disabled={cart.length === 0 || !cartValidation.isValid}
          className="col-span-2 sm:flex-1 order-1 sm:order-2 flex items-center justify-center gap-2 px-6 sm:px-10 py-3 sm:py-2.5 rounded-xl bg-[#6F2DA8] hover:bg-[#5C238C] focus:ring-2 focus:ring-[#6F2DA8]/40 active:scale-95 text-white font-bold text-sm shadow-soft-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed outline-none"
        >
          <CreditCard size={16} className="shrink-0" />
          <span className="truncate">{isQuickSale ? 'Quick Checkout (Pay)' : 'Proceed to Payment'}</span>
          <ChevronRight size={16} className="shrink-0" />
        </button>

        {/* Clear Cart */}
        <button
          ref={clearCartBtnRef}
          type="button"
          onClick={resetBill}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              proceedBtnRef.current?.focus();
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (pricedLines.length > 0) {
                focusBillCell(pricedLines.length - 1, 'qty');
              } else {
                productSearchInputRef.current?.focus();
                productSearchInputRef.current?.select();
              }
            }
          }}
          disabled={cart.length === 0}
          className="col-span-1 order-3 sm:order-3 flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 focus:bg-rose-50 focus:border-rose-400 focus:ring-2 focus:ring-rose-300 text-rose-600 font-bold text-xs shadow-2xs transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer outline-none"
          title="Clear cart (Right Arrow from Proceed)"
        >
          <Trash2 size={14} className="shrink-0" />
          <span className="truncate">Clear Cart</span>
        </button>
      </div>

      {/* 6. STATUS FOOTER BAR */}
      <div className="flex items-center justify-between text-xs text-[#697797] pt-1 border-t border-[#E5E7F5] shrink-0">
        <div className="flex items-center gap-2">
          <span>
            <kbd className="font-bold text-ink bg-white px-1.5 py-0.5 rounded border border-[#E5E7F5]">F6</kbd> : Save
          </span>
          <span>|</span>
          <span>
            <kbd className="font-bold text-ink bg-white px-1.5 py-0.5 rounded border border-[#E5E7F5]">Enter</kbd> : Select / Continue
          </span>
        </div>
        <div className="font-medium">
          KC Agency &nbsp;|&nbsp; POS Billing
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          totals={totals}
          customerName={customers.find((c) => String(c.id) === String(customerId))?.ledger_name}
          itemCount={pricedLines.length}
          splitMode={splitMode}
          setSplitMode={setSplitMode}
          payments={payments}
          setPayments={setPayments}
          hasCustomer={!!customerId}
          isQuickSale={isQuickSale}
          canDiscount={canDiscount}
          billDiscount={billDiscount}
          setBillDiscount={setBillDiscount}
          billDiscountMode={billDiscountMode}
          setBillDiscountMode={setBillDiscountMode}
          onBack={() => setShowPaymentModal(false)}
          onPay={() => completeMutation.mutate()}
          isPending={completeMutation.isPending}
          isValid={cartValidation.isValid}
          error={completeMutation.error?.response?.data?.error || completeMutation.error?.message || null}
        />
      )}

      {printingInvoiceId && <PrintPreviewModal invoiceId={printingInvoiceId} onClose={() => setPrintingInvoiceId(null)} />}
      {showImageSearch && (
        <ImageSearchModal
          onClose={() => setShowImageSearch(false)}
          onAdd={(item) => { addItem(item); setShowImageSearch(false); }}
        />
      )}
      {showBarcodeScanner && (
        <BarcodeScannerModal
          onClose={() => setShowBarcodeScanner(false)}
          onScan={handleBarcodeScanned}
        />
      )}
      {showQuickSaleModal && (
        <QuickSaleModal
          isOpen={showQuickSaleModal}
          onClose={() => setShowQuickSaleModal(false)}
          items={activeItems}
          getItemStock={getItemStock}
          priceType={priceType}
          onGenerateBill={() => {}}
          isGenerating={false}
        />
      )}
    </div>
  );
}

function PaymentModal({
  totals,
  customerName,
  itemCount,
  splitMode,
  setSplitMode,
  payments,
  setPayments,
  hasCustomer,
  isQuickSale,
  canDiscount,
  billDiscount,
  setBillDiscount,
  billDiscountMode,
  setBillDiscountMode,
  onBack,
  onPay,
  isPending,
  isValid = true,
  error,
}) {
  const grandTotal = totals.grandTotal;
  const paymentsTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remaining = Math.round((grandTotal - paymentsTotal) * 100) / 100;

  const toggleSplit = (next) => {
    setSplitMode(next);
    if (next) {
      setPayments(PAYMENT_METHODS.map((m) => ({ payment_method: m.key, amount: m.key === (!hasCustomer ? 'cash' : 'credit') ? grandTotal : 0, reference_no: '' })));
    } else {
      setPayments([{ payment_method: !hasCustomer ? 'cash' : 'credit', amount: grandTotal, reference_no: '' }]);
    }
  };

  const getAmount = (key) => Number(payments.find((p) => p.payment_method === key)?.amount || 0);

  const setSplitAmount = (key, raw) => {
    let value = Number(raw);
    if (Number.isNaN(value) || value < 0) value = 0;
    setPayments((prev) => {
      const othersTotal = prev.filter((p) => p.payment_method !== key).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const capped = Math.min(value, Math.max(0, grandTotal - othersTotal));
      const exists = prev.some((p) => p.payment_method === key);
      return exists
        ? prev.map((p) => (p.payment_method === key ? { ...p, amount: capped } : p))
        : [...prev, { payment_method: key, amount: capped, reference_no: '' }];
    });
  };

  const singleMethod = payments[0]?.payment_method || (!hasCustomer ? 'cash' : 'credit');
  const singleAmount = payments[0]?.amount ?? grandTotal;

  const setSingleAmount = (raw) => {
    let value = Number(raw);
    if (Number.isNaN(value) || value < 0) value = 0;
    if (value > grandTotal) value = grandTotal;
    setPayments((prev) => [{ ...prev[0], amount: value }]);
  };

  const blockedNoCustomer = remaining > 0.009 && !hasCustomer;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4">
      <div className="w-full max-w-md card p-4 shadow-soft-lg max-h-[92vh] overflow-y-auto">
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <div className="text-base font-bold text-ink">{isQuickSale ? 'Quick Sale Payment' : 'Payment'}</div>
            {isQuickSale && (
              <span className="rounded bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                Quick Sale
              </span>
            )}
          </div>
          <div className="text-xs text-ink-muted">{customerName || (isQuickSale ? 'Quick Sale (Walk-in / Guest)' : 'Walk-in Customer')} · {itemCount} item(s)</div>
        </div>

        <div className="mb-2.5 rounded-lg bg-[#EEE5FF] px-3 py-1.5 text-center border border-[#D8CEE2]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#6F2DA8]">Total Payable</div>
          <div className="text-lg font-black text-[#351442] leading-tight">₹ {grandTotal.toFixed(2)}</div>
        </div>

        <div className="mb-2 flex overflow-hidden rounded-lg border border-border-soft bg-page p-0.5 text-xs">
          <button
            type="button"
            onClick={() => toggleSplit(false)}
            className={`flex-1 rounded-md px-3 py-1 font-bold transition-all ${!splitMode ? 'bg-white shadow-soft text-ink' : 'text-ink-muted'}`}
          >
            Single Payment
          </button>
          <button
            type="button"
            onClick={() => toggleSplit(true)}
            className={`flex-1 rounded-md px-3 py-1 font-bold transition-all ${splitMode ? 'bg-white shadow-soft text-ink' : 'text-ink-muted'}`}
          >
            Split Payment
          </button>
        </div>

        {!splitMode ? (
          <>
            <div className="mb-1 text-[11px] font-semibold text-ink-muted">Payment Method</div>
            <div className="mb-2 grid grid-cols-5 gap-1.5">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setPayments((prev) => [{ ...prev[0], payment_method: m.key }])}
                  className={`rounded-lg border px-1 py-1.5 text-xs font-bold transition-all text-center ${
                    singleMethod === m.key
                      ? 'border-[#6F2DA8] bg-[#EEE5FF] text-[#6F2DA8]'
                      : 'border-border-soft bg-white text-ink-muted hover:bg-page'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="mb-1 text-[11px] font-semibold text-ink-muted">Amount</div>
            <input
              type="number"
              min="0"
              step="any"
              value={singleAmount}
              onChange={(e) => setSingleAmount(e.target.value)}
              className="input mb-2 text-base font-bold py-1.5"
            />
          </>
        ) : (
          <div className="mb-2 flex flex-col gap-1.5">
            {PAYMENT_METHODS.map((m) => (
              <div key={m.key} className="flex items-center justify-between gap-2">
                <span className="w-14 text-xs font-bold text-ink">{m.label}</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={getAmount(m.key)}
                  onChange={(e) => setSplitAmount(m.key, e.target.value)}
                  className="input flex-1 text-right text-xs py-1"
                />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-0.5 mb-2 text-xs text-ink-muted border-t border-border-soft pt-1.5">
          <div className="flex justify-between">
            <span>Subtotal</span><span>₹ {totals.subtotal.toFixed(2)}</span>
          </div>
          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-danger font-semibold">
              <span>Discount</span><span>- ₹ {totals.discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-ink">
            <span>Paid</span><span>₹ {paymentsTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className={`mb-2 flex justify-between rounded-lg px-3 py-1.5 text-xs font-bold ${
          remaining > 0.009 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          <span>{remaining > 0.009 ? 'Remaining (on credit)' : 'Fully Paid'}</span>
          <span>₹ {Math.max(remaining, 0).toFixed(2)}</span>
        </div>

        {blockedNoCustomer && (
          <p className="mb-1.5 text-xs text-danger font-medium">Select a customer above to allow a partial/credit payment — a walk-in sale must be paid in full.</p>
        )}
        {!isValid && (
          <p className="mb-1.5 text-xs font-bold text-danger">⚠️ Cannot complete payment: one or more items exceed available stock.</p>
        )}
        {error && <p className="mb-1.5 text-xs text-danger font-medium">{error}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t border-border-soft">
          <Button variant="secondary" size="sm" onClick={onBack} disabled={isPending}>Back</Button>
          <Button size="sm" onClick={onPay} disabled={isPending || blockedNoCustomer || !isValid}>
            {isPending ? 'Processing…' : 'Pay Now (F6)'}
          </Button>
        </div>
      </div>
    </div>
  );
}
