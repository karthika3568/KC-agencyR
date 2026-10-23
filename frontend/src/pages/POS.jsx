import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ScanBarcode, Plus, UserPlus, User, Grid2x2, List, Minus, Trash2, Clock, Barcode, Image as ImageIcon, Camera, PackageX, Zap } from 'lucide-react';
import { itemsApi, stockUnitsApi, categoriesApi } from '../api/catalog';
import { customersApi } from '../api/parties';
import { invoicesApi } from '../api/invoices';
import { stockHubApi, customerPrebookingsApi } from '../api/purchasing';
import { settingsApi } from '../api/admin';
import { useBranchStore } from '../store/branchStore';
import { usePermission } from '../hooks/usePermission';
import { priceLine, computeCartTotals, resolveUnitPricing, resolveSellingPrice } from '../utils/pricing';
import { resolveImageUrl } from '../utils/media';
import { Badge } from '../components/Badge.jsx';
import { Card } from '../components/Card.jsx';
import { Button } from '../components/Button.jsx';
import { PrintPreviewModal } from '../components/PrintPreviewModal.jsx';
import { ImageSearchModal } from '../components/ImageSearchModal.jsx';
import { CustomerSelect } from '../components/CustomerSelect.jsx';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal.jsx';
import { QuickSaleModal } from '../components/QuickSaleModal.jsx';

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'upi', label: 'UPI' },
  { key: 'card', label: 'Card' },
  { key: 'credit', label: 'Credit' },
  { key: 'other', label: 'Other' },
];

function ProductThumb({ item, size = 'h-20', className = '' }) {
  const url = item.image ? resolveImageUrl(item.image) : null;
  const [broken, setBroken] = useState(false);
  return (
    <div className={`flex ${size} items-center justify-center overflow-hidden rounded-lg bg-page ${className}`}>
      {url && !broken ? (
        <img src={url} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <ImageIcon size={22} className="text-ink-muted/50" />
      )}
    </div>
  );
}

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

// billType overrides the item's own GST% for display — a Non-GST invoice
// must never show a cart line as taxed, even though the item master keeps
// its GST% untouched.
function taxBadge(item, billType = 'gst') {
  const pct = billType === 'non_gst' ? 0 : Number(item.gst_percent || 0);
  return pct > 0 ? <Badge variant="gst">GST {pct}%</Badge> : <Badge variant="non-gst">Non-GST</Badge>;
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
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedGridIndex, setSelectedGridIndex] = useState(-1);
  const [heldId, setHeldId] = useState(null);
  const [showHeldList, setShowHeldList] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  // Payment method defaults to Credit every time (section 7 of the billing
  // requirements) — a completed credit invoice is still a completed sale;
  // revenue/profit are recognized immediately (see InvoiceModel::complete),
  // this default only changes what the payment modal shows pre-selected.
  const [payments, setPayments] = useState([{ payment_method: 'credit', amount: 0, reference_no: '' }]);
  const [message, setMessage] = useState('');
  const [printingInvoiceId, setPrintingInvoiceId] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showQuickSaleModal, setShowQuickSaleModal] = useState(false);
  const searchInputRef = useRef(null);
  const [scanError, setScanError] = useState('');
  const [isScannerReady, setIsScannerReady] = useState(false);
  const scanErrorTimeoutRef = useRef(null);
  const scannerReadyTimeoutRef = useRef(null);
  const lastScanRef = useRef({ code: '', time: 0 });

  const showScanError = (msg) => {
    setIsScannerReady(false);
    setScanError(msg);
    if (scanErrorTimeoutRef.current) clearTimeout(scanErrorTimeoutRef.current);
    scanErrorTimeoutRef.current = setTimeout(() => {
      setScanError('');
    }, 3000);
  };

  const activateScanner = () => {
    setScanError('');
    setIsScannerReady(true);
    if (scannerReadyTimeoutRef.current) clearTimeout(scannerReadyTimeoutRef.current);
    scannerReadyTimeoutRef.current = setTimeout(() => {
      setIsScannerReady(false);
    }, 5000);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  };

  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });
  const unitsQuery = useQuery({ queryKey: ['stock-units'], queryFn: stockUnitsApi.list });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const heldQuery = useQuery({ queryKey: ['invoices', 'held'], queryFn: () => invoicesApi.list('held') });
  const stockQuery = useQuery({ queryKey: ['stock-hub', 'branch', selectedBranchId], queryFn: () => stockHubApi.list({ owner_type: 'branch', owner_id: selectedBranchId }), enabled: canViewStock && !!selectedBranchId });
  const freeQtyQuery = useQuery({ queryKey: ['settings-free-qty'], queryFn: settingsApi.getFreeQty });

  const items = useMemo(() => (Array.isArray(itemsQuery.data) ? itemsQuery.data : (itemsQuery.data?.items || [])), [itemsQuery.data]);
  const customers = customersQuery.data || [];
  const units = unitsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const heldInvoices = heldQuery.data || [];

  const selectedCustomer = useMemo(() => customers.find((c) => String(c.id) === String(customerId)), [customers, customerId]);
  
  useEffect(() => {
    if (selectedCustomer) {
      setBillingFormat(Number(selectedCustomer.is_local_customer) === 1 ? 'local' : 'outstation');
    }
  }, [selectedCustomer]);

  // Selecting a customer auto-applies their configured pricing type
  // (Normal/Retail/Wholesale — section 4 of the customer requirements) so
  // the cashier doesn't have to remember to switch the mode by hand. This
  // only fires when the customer actually changes, so if the cashier then
  // manually picks a different price tab for this bill, nothing here
  // overwrites that choice again until a different customer is selected.
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

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return activeItems
      .filter(
        (i) =>
          i.item_name.toLowerCase().includes(term) ||
          (i.item_code || '').toLowerCase().includes(term) ||
          (i.barcode || '').toLowerCase() === term
      )
      .slice(0, 8);
  }, [activeItems, search]);

  const gridItems = useMemo(() => {
    if (activeCategory === 'all') return activeItems;
    return activeItems.filter((i) => String(i.category_id) === String(activeCategory));
  }, [activeItems, activeCategory]);

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
            discount_amount: effectiveDiscount,
            discount_percent: cleanPercent,
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
              discount_amount: effectiveDiscount,
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
      const ex = prev.find((l) => l.item.id === item.id && l.unit_id === item.base_unit_id);
      if (ex) {
        return prev.map((l) => (l.key === ex.key ? { ...l, qty: Number(l.qty) + 1 } : l));
      }
      return [...prev, newLine(item, priceType)];
    });
    setSearch('');
    if (searchInputRef.current) searchInputRef.current.value = '';
    setSelectedIndex(-1);
    setScanError('');
    setIsScannerReady(false);
    searchInputRef.current?.focus();
    return true;
  };

  const processScanOrSearch = (rawCode) => {
    const term = (rawCode !== undefined ? String(rawCode) : (searchInputRef.current?.value || search)).trim();
    if (!term) return;

    // Prevent duplicate scan processing within 400ms (handles CR+LF keyboard wedge scanners)
    const now = Date.now();
    if (lastScanRef.current.code === term && now - lastScanRef.current.time < 400) {
      return;
    }
    lastScanRef.current = { code: term, time: now };

    const lowerTerm = term.toLowerCase();

    // 1. Exact match by barcode (priority for barcode scanners)
    let matched = items.find((i) => (i.barcode || '').trim().toLowerCase() === lowerTerm);

    // 2. Exact match by item_code
    if (!matched) {
      matched = items.find((i) => (i.item_code || '').trim().toLowerCase() === lowerTerm);
    }

    // 3. Dropdown selection / single search match fallback
    if (!matched) {
      if (selectedIndex >= 0 && selectedIndex < filteredItems.length) {
        matched = filteredItems[selectedIndex];
      } else if (filteredItems.length === 1) {
        matched = filteredItems[0];
      }
    }

    if (!matched) {
      showScanError('Product not found');
      setSearch('');
      if (searchInputRef.current) searchInputRef.current.value = '';
      setSelectedIndex(-1);
      searchInputRef.current?.focus();
      return;
    }

    addItem(matched);
  };

  const handleBarcodeScanned = (rawCode) => {
    const term = String(rawCode || '').trim();
    if (!term) return { success: false, reason: 'empty', message: 'No barcode entered' };

    const lowerTerm = term.toLowerCase();

    // 1. Exact match by barcode (priority)
    let matched = items.find((i) => (i.barcode || '').trim().toLowerCase() === lowerTerm);

    // 2. Exact match by item_code
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

  // Section: keyboard shortcuts & barcode scanner wedge listener
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (cart.length > 0) {
          handleProceedToPayment();
        } else {
          setMessage('Bill is empty. Scan or search products to begin.');
          setTimeout(() => setMessage(''), 3000);
        }
        return;
      }

      if (showPaymentModal || showImageSearch || printingInvoiceId || showBarcodeScanner || showQuickSaleModal) {
        return;
      }

      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      // If user is focused on another input (e.g. customer search, discount), don't interfere
      if (isInput && document.activeElement !== searchInputRef.current) {
        return;
      }

      if (e.key === 'ArrowRight') {
        if (gridItems.length > 0 && filteredItems.length === 0) {
          e.preventDefault();
          setSelectedGridIndex((prev) => (prev < gridItems.length - 1 ? prev + 1 : 0));
        }
      } else if (e.key === 'ArrowLeft') {
        if (gridItems.length > 0 && filteredItems.length === 0) {
          e.preventDefault();
          setSelectedGridIndex((prev) => (prev > 0 ? prev - 1 : gridItems.length - 1));
        }
      } else if (e.key === 'Enter') {
        const currentVal = (searchInputRef.current?.value || search).trim();
        if (currentVal) {
          e.preventDefault();
          processScanOrSearch(currentVal);
        } else if (!isInput && selectedGridIndex >= 0 && selectedGridIndex < gridItems.length) {
          e.preventDefault();
          addItem(gridItems[selectedGridIndex]);
        }
      } else if (!isInput && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Scanned or typed while non-input element was active; route into search input
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          const currentVal = searchInputRef.current.value || '';
          searchInputRef.current.value = currentVal + e.key;
          setSearch(searchInputRef.current.value);
          if (scanError) setScanError('');
          if (isScannerReady) setIsScannerReady(false);
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart, gridItems, filteredItems, selectedGridIndex, search, showPaymentModal, showImageSearch, printingInvoiceId, showBarcodeScanner, showQuickSaleModal, scanError, isScannerReady, stockByItemId, items, priceType]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [search]);

  useEffect(() => {
    setSelectedGridIndex(-1);
  }, [activeCategory, search]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      if (filteredItems.length > 0) {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
      } else if (gridItems.length > 0) {
        e.preventDefault();
        setSelectedGridIndex((prev) => (prev < gridItems.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      if (filteredItems.length > 0) {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
      } else if (gridItems.length > 0) {
        e.preventDefault();
        setSelectedGridIndex((prev) => (prev > 0 ? prev - 1 : gridItems.length - 1));
      }
    } else if (e.key === 'ArrowRight') {
      if (filteredItems.length === 0 && gridItems.length > 0) {
        e.preventDefault();
        setSelectedGridIndex((prev) => (prev < gridItems.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowLeft') {
      if (filteredItems.length === 0 && gridItems.length > 0) {
        e.preventDefault();
        setSelectedGridIndex((prev) => (prev > 0 ? prev - 1 : gridItems.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const currentVal = (searchInputRef.current?.value || search).trim();
      if (currentVal) {
        processScanOrSearch(currentVal);
      } else if (selectedGridIndex >= 0 && selectedGridIndex < gridItems.length) {
        addItem(gridItems[selectedGridIndex]);
      }
    } else if (e.key === 'Escape') {
      setSearch('');
      if (searchInputRef.current) searchInputRef.current.value = '';
      setSelectedIndex(-1);
      setSelectedGridIndex(-1);
      setScanError('');
      setIsScannerReady(false);
    }
  };

  const updateLine = (key, patch) => setCart((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  // Switching a line's unit (e.g. PCS -> BOX) re-prices it from that unit's
  // own NET_SRATE/Retail/Wholesale rate (never the primary-unit rate) —
  // mirrors ItemModel::resolveSellingPrice server-side.
  const changeLineUnit = (line, unitId) => {
    const pricing = resolveSellingPrice(line.item, unitId, priceType);
    updateLine(line.key, { unit_id: unitId, rate: pricing.rate });
  };
  // The cart's `rate` field is a stored, user-editable value (so a manual
  // price override at sale time sticks) — switching Normal/Retail/Wholesale
  // must therefore explicitly re-price every existing line, not just flip a
  // display flag, or the cart would silently keep showing the old rate
  // (section 13). Only triggered by the user's own click, never on mount/
  // resume, so resuming a held Retail/Wholesale bill keeps its actual
  // snapshotted rate instead of being silently re-priced to Normal.
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
  };

  const handleWalkinSelect = () => {
    setCustomerId('');
    setIsQuickSale(false);
  };

  const handleQuickSale = () => {
    setShowQuickSaleModal(true);
  };

  const quickSaleGenerateMutation = useMutation({
    mutationFn: async (quickSaleItems) => {
      // 1. Price each Quick Sale item directly using existing POS pricing rules
      const lines = quickSaleItems.map((it) => {
        if (it.is_manual) {
          const qty = Number(it.qty);
          const rate = Number(it.rate);
          const gross = Math.round(qty * rate * 100) / 100;
          return {
            key: it.key || `manual-${Date.now()}-${Math.random()}`,
            is_manual: true,
            item: null,
            item_name_snapshot: it.name,
            qty,
            free_qty: 0,
            discount_percent: 0,
            discount_amount: 0,
            discount_mode: 'percent',
            unit_id: it.unit_id || 1,
            rate,
            gross,
            tax_percent: 0,
            cess_percent: 0,
            tax_amount: 0,
            cess_amount: 0,
            line_total: gross,
          };
        }
        const lineData = {
          key: `${it.id}-${Date.now()}-${Math.random()}`,
          item: it.rawItem,
          qty: Number(it.qty),
          free_qty: 0,
          discount_percent: 0,
          discount_amount: '',
          discount_mode: 'percent',
          unit_id: it.unit_id || it.rawItem.base_unit_id,
          rate: Number(it.rate),
        };
        const priced = priceLine(
          it.rawItem,
          lineData,
          billType,
          priceType
        );
        return {
          ...lineData,
          priced,
          gross: priced.gross,
          discount_amount: priced.discount_amount,
          tax_percent: priced.tax_percent,
          cess_percent: priced.cess_percent,
          tax_amount: priced.tax_amount,
          cess_amount: priced.cess_amount,
          line_total: priced.line_total,
        };
      });

      const computedTotals = computeCartTotals(lines, { amount: '', mode: 'amount' });

      // 2. Build payload directly from Quick Sale items without modifying the main cart
      const payload = {
        bill_type: billType,
        price_type: priceType,
        customer_id: null,
        vehicle_no: null,
        items: computedTotals.updatedLines.map((l) => ({
          item_id: l.item ? l.item.id : null,
          item_name: l.item ? undefined : l.item_name_snapshot,
          qty: Number(l.qty),
          free_qty: 0,
          unit_id: l.unit_id || 1,
          ...(canDiscount
            ? { discount_amount: Number(l.combined_discount_amount ?? l.discount_amount ?? 0) }
            : {}),
          ...(canEditPrice || l.is_manual ? { rate: Number(l.rate) } : {}),
        })),
      };

      // 3. Create held invoice in database
      const created = await invoicesApi.create(payload);

      // 4. Complete immediately with Cash payment per walk-in sales rule
      const payments = [{ payment_method: 'cash', amount: computedTotals.grandTotal, reference_no: '' }];
      const completed = await invoicesApi.complete(created.id, payments);
      return completed;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'held'] });
      queryClient.invalidateQueries({ queryKey: ['stock-hub'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setShowQuickSaleModal(false);
      setPrintingInvoiceId(result.id);
      setMessage(`Quick Sale Invoice ${result.invoice_no} generated successfully.`);
      setTimeout(() => setMessage(''), 4000);
    },
    onError: (err) => {
      setMessage(err?.response?.data?.error || err.message || 'Failed to generate Quick Sale bill');
      setTimeout(() => setMessage(''), 4000);
    },
  });

  const handleGenerateBillFromQuickSale = (quickSaleItems) => {
    if (!quickSaleItems || quickSaleItems.length === 0) return;
    if (quickSaleGenerateMutation.isPending) return;
    quickSaleGenerateMutation.mutate(quickSaleItems);
  };

  const handleCustomerSelectChange = (id) => {
    setCustomerId(id);
    if (id) setIsQuickSale(false);
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices', 'held'] }),
  });

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
    // Restore the stored mode directly (never via changePriceType) so the
    // held bill's already-snapshotted line rates aren't silently re-priced.
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

  const paymentsTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remaining = Math.round((totals.grandTotal - paymentsTotal) * 100) / 100;
  const now = new Date();

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex overflow-hidden rounded-lg border border-border-soft bg-white">
          <button
            disabled={!canGst}
            onClick={() => setBillType('gst')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${billType === 'gst' ? 'bg-navbar text-gold' : 'text-ink-muted'} disabled:opacity-40`}
          >
            GST Billing
          </button>
          <button
            disabled={!canNonGst}
            onClick={() => setBillType('non_gst')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${billType === 'non_gst' ? 'bg-navbar text-gold' : 'text-ink-muted'} disabled:opacity-40`}
          >
            Non-GST / Estimate
          </button>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-border-soft bg-white">
          <button
            onClick={() => setBillingFormat('local')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${billingFormat === 'local' ? 'bg-navbar text-gold' : 'text-ink-muted'}`}
          >
            Local Billing
          </button>
          <button
            onClick={() => setBillingFormat('outstation')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${billingFormat === 'outstation' ? 'bg-navbar text-gold' : 'text-ink-muted'}`}
          >
            Distance Billing
          </button>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-border-soft bg-white">
          {[
            { key: 'normal', label: 'Normal' },
            { key: 'retail', label: 'Retail' },
            { key: 'wholesale', label: 'Wholesale' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => changePriceType(opt.key)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${priceType === opt.key ? 'bg-navbar text-gold' : 'text-ink-muted'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {message && <span className="text-xs font-medium text-success">{message}</span>}
          <Button variant="secondary" size="sm" onClick={() => setShowHeldList((v) => !v)}>
            Hold Bills ({heldInvoices.length})
          </Button>
        </div>
      </div>

      {showHeldList && (
        <Card className="mb-4 p-3">
          {heldInvoices.length === 0 && <p className="text-sm text-ink-muted">No held bills.</p>}
          {heldInvoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between border-b border-border-soft py-2 text-sm last:border-0">
              <span>
                #{inv.id} · {inv.bill_type.toUpperCase()} · {inv.customer_name || 'Walk-in'} · Rs. {inv.grand_total}
              </span>
              <div className="flex gap-3">
                <button onClick={() => resumeHeld(inv.id)} className="font-medium text-gold hover:underline">
                  Resume
                </button>
                {canVoidHold && (
                  <button onClick={() => discardHeld(inv.id)} className="font-medium text-danger hover:underline">
                    Discard
                  </button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[1fr_360px]">
        {/* Left panel — product browsing */}
        <div>
          <Card className="mb-2 p-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Walk-in Customer Quick Select Button */}
              <button
                type="button"
                onClick={handleWalkinSelect}
                className={`h-8 px-2.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                  !customerId
                    ? 'bg-gold text-white shadow-sm font-semibold'
                    : 'bg-white text-ink border border-border-soft hover:bg-page'
                }`}
                title="Select Walk-in Customer"
              >
                <User size={14} />
                Walk-in
              </button>

              {/* Quick Sale Button */}
              <button
                type="button"
                onClick={handleQuickSale}
                className="h-8 px-2.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 bg-gold/10 text-gold border border-gold/30 hover:bg-gold hover:text-white"
                title="Quick Sale (Open Quick Sale popup)"
              >
                <Zap size={14} className="fill-current" />
                Quick Sale
              </button>

              {/* Searchable Customer Dropdown */}
              <CustomerSelect
                customers={customers}
                value={customerId}
                onChange={handleCustomerSelectChange}
                placeholder="Search customer by name or phone…"
                className="w-56 sm:w-64"
              />
              <Link to="/parties">
                <Button variant="primary" size="sm" icon={<UserPlus size={13} />}>
                  Add Customer
                </Button>
              </Link>

              <div className="relative min-w-[200px] flex-1">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  ref={searchInputRef}
                  autoFocus
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    if (scanError) setScanError('');
                    if (isScannerReady) setIsScannerReady(false);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={isScannerReady ? "Ready to scan barcode… (aim scanner or type)" : "Search product by name, code or barcode…"}
                  className={`input pl-8 py-1 text-xs transition-all ${
                    scanError
                      ? 'border-danger focus:ring-danger'
                      : isScannerReady
                      ? 'border-gold ring-2 ring-gold/40 bg-gold/5 font-medium'
                      : ''
                  }`}
                />
                {scanError && (
                  <div className="absolute left-0 top-full z-20 mt-1 flex items-center gap-1.5 rounded-lg border border-danger/40 bg-white px-3 py-1.5 text-xs font-semibold text-danger shadow-md">
                    <PackageX size={14} className="shrink-0" />
                    <span>{scanError}</span>
                  </div>
                )}
                {isScannerReady && !scanError && (
                  <div className="absolute left-0 top-full z-20 mt-1 flex items-center gap-2 rounded-lg border border-gold/40 bg-white px-3 py-1.5 text-xs font-semibold text-gold-dark shadow-md">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-gold"></span>
                    </span>
                    <span>Ready to scan barcode</span>
                  </div>
                )}
                {filteredItems.length > 0 && !scanError && !isScannerReady && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-auto rounded-lg border border-border-soft bg-white shadow-lg">
                    {filteredItems.map((item, index) => {
                      const isHighlighted = index === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          ref={(el) => {
                            if (isHighlighted && el) {
                              el.scrollIntoView({ block: 'nearest' });
                            }
                          }}
                          onClick={() => addItem(item)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition-colors ${
                            isHighlighted ? 'bg-gold/15 text-gold-dark font-semibold' : 'hover:bg-page'
                          }`}
                        >
                          <span>{item.item_name} <span className="text-ink-muted">({item.item_code})</span></span>
                          <span className="text-ink-muted">Rs. {resolveSellingPrice(item, item.base_unit_id, priceType).rate.toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowBarcodeScanner(true)}
                title="Scan barcode with camera"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold hover:bg-gold-soft active:scale-95 text-white shrink-0 shadow-sm transition-all"
              >
                <ScanBarcode size={15} />
              </button>
              <button
                onClick={() => setShowImageSearch(true)}
                title="Find an item from a photo"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-soft bg-white text-ink-muted hover:bg-page shrink-0"
              >
                <Camera size={15} />
              </button>
            </div>
          </Card>


          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveCategory('all')}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${activeCategory === 'all' ? 'bg-gold text-white' : 'border border-border-soft bg-white text-ink-muted hover:bg-page'}`}
            >
              All
            </button>
            {activeCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${activeCategory === c.id ? 'bg-gold text-white' : 'border border-border-soft bg-white text-ink-muted hover:bg-page'}`}
              >
                {c.name}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-ink-muted">{gridItems.length} products</span>
              <div className="flex overflow-hidden rounded-lg border border-border-soft bg-white">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs ${viewMode === 'grid' ? 'bg-page font-semibold text-ink' : 'text-ink-muted'}`}
                >
                  <Grid2x2 size={13} /> Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs ${viewMode === 'list' ? 'bg-page font-semibold text-ink' : 'text-ink-muted'}`}
                >
                  <List size={13} /> List
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {gridItems.map((item, index) => {
                const stock = getItemStock(item);
                const isOutOfStock = stock <= 0;
                const outOfStock = canViewStock && isOutOfStock;
                const lowStock = canViewStock && !isOutOfStock && stock <= Number(item.min_stock_threshold || 0);
                const isSelected = index === selectedGridIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isOutOfStock}
                    ref={(el) => {
                      if (isSelected && el) {
                        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                      }
                    }}
                    onClick={() => {
                      if (isOutOfStock) return;
                      addItem(item);
                      setSelectedGridIndex(index);
                    }}
                    onMouseEnter={() => {
                      if (!isOutOfStock) setSelectedGridIndex(index);
                    }}
                    className={`card group relative flex flex-col p-3 text-left transition-all ${
                      isOutOfStock
                        ? 'opacity-60 cursor-not-allowed'
                        : isSelected
                        ? 'ring-2 ring-gold border-gold bg-gold/5 shadow-md -translate-y-0.5 active:translate-y-0 active:shadow-sm'
                        : 'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm'
                    }`}
                  >
                    <ProductThumb item={item} size="h-20" className="mb-2" />
                    {outOfStock && (
                      <span className="absolute right-2 top-2 rounded-full bg-danger px-2 py-0.5 text-[10px] font-semibold text-white">Out of stock</span>
                    )}
                    {!outOfStock && lowStock && (
                      <span className="absolute right-2 top-2 rounded-full bg-warning px-2 py-0.5 text-[10px] font-semibold text-white">Low stock</span>
                    )}
                    <div className="truncate text-sm font-semibold text-ink">{item.item_name}</div>
                    <div className="mb-1 font-bold text-ink">Rs. {resolveSellingPrice(item, item.base_unit_id, priceType).rate.toFixed(2)}</div>
                    <div className="mb-1">{taxBadge(item)}</div>
                    <div className="flex items-center justify-between text-xs text-ink-muted">
                      <span>{canViewStock ? `Stock: ${stock}` : item.item_code}</span>
                      {item.barcode && <Barcode size={14} />}
                    </div>
                    <div className={`pointer-events-none absolute inset-0 rounded-xl border-2 border-gold transition-opacity ${!isOutOfStock && isSelected ? 'opacity-100' : !isOutOfStock ? 'opacity-0 group-active:opacity-100' : 'opacity-0'}`} />
                  </button>
                );
              })}
              {gridItems.length === 0 && (
                <div className="col-span-full py-10 text-center text-ink-muted">No products in this category.</div>
              )}
            </div>
          ) : (
            <Card>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-left text-xs uppercase text-ink-muted">
                    <th className="px-4 py-2"></th>
                    <th className="px-4 py-2">Item</th>
                    <th className="px-4 py-2">Price</th>
                    <th className="px-4 py-2">Tax</th>
                    <th className="px-4 py-2">{canViewStock ? 'Stock' : 'Code'}</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {gridItems.map((item, index) => {
                    const stock = getItemStock(item);
                    const isOutOfStock = stock <= 0;
                    const isSelected = index === selectedGridIndex;
                    return (
                      <tr
                        key={item.id}
                        ref={(el) => {
                          if (isSelected && el) {
                            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                          }
                        }}
                        onClick={() => {
                          if (isOutOfStock) return;
                          addItem(item);
                          setSelectedGridIndex(index);
                        }}
                        onMouseEnter={() => {
                          if (!isOutOfStock) setSelectedGridIndex(index);
                        }}
                        className={`border-b border-border-soft last:border-0 transition-colors ${
                          isOutOfStock
                            ? 'opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'cursor-pointer bg-gold/15 font-semibold text-gold-dark'
                            : 'cursor-pointer hover:bg-page'
                        }`}
                      >
                        <td className="px-4 py-2"><ProductThumb item={item} size="h-9 w-9" /></td>
                        <td className="px-4 py-2 font-medium text-ink">
                          {item.item_name}
                          {isOutOfStock && canViewStock && (
                            <span className="ml-2 inline-block rounded-full bg-danger px-2 py-0.5 text-[10px] font-semibold text-white">Out of stock</span>
                          )}
                        </td>
                        <td className="px-4 py-2">Rs. {resolveSellingPrice(item, item.base_unit_id, priceType).rate.toFixed(2)}</td>
                        <td className="px-4 py-2">{taxBadge(item)}</td>
                        <td className="px-4 py-2 text-ink-muted">{canViewStock ? stock : item.item_code}</td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isOutOfStock}
                            icon={<Plus size={14} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isOutOfStock) return;
                              addItem(item);
                              setSelectedGridIndex(index);
                            }}
                          >
                            Add
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {gridItems.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-muted">No products in this category.</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        {/* Right panel — Current Bill */}
        <div>
          <Card className="flex flex-col p-3">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <div className="text-base font-bold text-ink">Current Bill</div>
                <div className="text-xs text-ink-muted">{pricedLines.length} item(s)</div>
              </div>
              <div className="flex items-center gap-1 text-xs text-ink-muted">
                <Clock size={12} />
                {now.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {linkedPrebooking && (
              <div className="mb-2 flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs text-emerald-800">
                <div className="flex items-center gap-1.5 font-medium truncate">
                  <span>Order:</span>
                  <span className="font-mono font-bold">{linkedPrebooking.prebooking_no}</span>
                  <span className="truncate">· {linkedPrebooking.customer_name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLinkedPrebooking(null);
                    searchParams.delete('prebooking_id');
                    setSearchParams(searchParams);
                  }}
                  className="ml-2 font-bold text-emerald-700 hover:text-danger px-1"
                  title="Unlink Pre-Booking from this bill"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="mb-2 flex max-h-72 flex-col gap-1.5 overflow-y-auto">
              {pricedLines.map((line) => {
                const availableStock = line.item ? getItemStock(line.item) : Infinity;
                const requestedQty = Number(line.qty) || 0;
                const requestedFree = isFreeQtyAllowed ? (Number(line.free_qty) || 0) : 0;
                const totalLineReq = requestedQty + requestedFree;
                const otherLinesQty = line.item
                  ? cart
                      .filter((l) => l.key !== line.key && l.item?.id === line.item.id)
                      .reduce((sum, l) => sum + (Number(l.qty) || 0) + (isFreeQtyAllowed ? (Number(l.free_qty) || 0) : 0), 0)
                  : 0;
                const totalItemReq = totalLineReq + otherLinesQty;
                const isLineOverstock = line.item && (totalItemReq > availableStock || requestedQty <= 0);
                const isMaxReached = line.item && (totalItemReq >= availableStock);

                return (
                <div key={line.key} className={`flex gap-2 rounded-lg border p-2 ${isLineOverstock ? 'border-danger bg-danger/5' : 'border-border-soft'}`}>
                  <ProductThumb item={line.item} size="h-12 w-12" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink">{line.item ? line.item.item_name : (line.name || line.item_name_snapshot)}</div>
                        <div className="mt-0.5 flex items-center gap-1">
                          {line.item && taxBadge(line.item, billType)}
                          {Number(line.free_qty) > 0 && isFreeQtyAllowed && <Badge variant="warning">Free: {line.free_qty}</Badge>}
                          {line.item && (
                            <span className="text-[11px] text-ink-muted">
                              (Stock: <span className={availableStock <= 0 ? 'text-danger font-bold' : 'font-medium'}>{availableStock}</span>)
                            </span>
                          )}
                          {line.item && !line.priced.price_configured && (
                            <Badge variant="warning" title={`No ${priceType} price set — using Normal NET_SRATE`}>
                              {priceType === 'retail' ? 'Retail' : 'Wholesale'} price not set
                            </Badge>
                          )}
                        </div>
                      </div>
                      <button onClick={() => removeLine(line.key)} className="shrink-0 text-ink-muted hover:text-danger">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => bumpQty(line, -1)}
                          disabled={requestedQty <= 1}
                          className={`flex h-6 w-6 items-center justify-center rounded border border-border-soft ${
                            requestedQty <= 1 ? 'cursor-not-allowed opacity-40 bg-page text-ink-muted/50' : 'text-ink-muted hover:bg-page'
                          }`}
                          title="Decrease quantity"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          value={line.qty}
                          onChange={(e) => updateLine(line.key, { qty: e.target.value })}
                          className={`w-12 rounded border px-1 py-0.5 text-center text-sm font-medium ${
                            isLineOverstock ? 'border-danger bg-danger/10 text-danger font-bold' : 'border-border-soft text-ink'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => bumpQty(line, 1)}
                          disabled={isMaxReached}
                          className={`flex h-6 w-6 items-center justify-center rounded border border-border-soft ${
                            isMaxReached ? 'cursor-not-allowed opacity-40 bg-page text-ink-muted/50' : 'text-ink-muted hover:bg-page'
                          }`}
                          title={isMaxReached ? `Max available stock reached (${availableStock})` : 'Increase quantity'}
                        >
                          <Plus size={12} />
                        </button>
                        {line.item?.secondary_unit_id ? (
                          <select
                            value={line.unit_id}
                            onChange={(e) => changeLineUnit(line, Number(e.target.value))}
                            className="rounded border border-border-soft px-1 py-0.5 text-xs text-ink-muted"
                          >
                            {[line.item.base_unit_id, line.item.secondary_unit_id].map((id) => (
                              <option key={id} value={id}>{units.find((u) => u.id === id)?.short_code || ''}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-ink-muted">{units.find((u) => u.id === line.unit_id)?.short_code || ''}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-xs text-ink-muted" title="MRP">MRP {Number(line.priced.mrp).toFixed(2)}</span>
                        <input
                          type="number"
                          step="any"
                          disabled={!canEditPrice}
                          value={line.rate}
                          title="Net Rate"
                          onChange={(e) => updateLine(line.key, { rate: e.target.value })}
                          className="w-14 rounded border border-border-soft px-1 py-0.5 text-right disabled:bg-page"
                        />
                        <span className="w-16 text-right font-semibold text-ink">Rs. {line.priced.line_total.toFixed(2)}</span>
                      </div>
                    </div>
                    {isLineOverstock && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-danger">
                        {requestedQty <= 0 ? (
                          <span>⚠️ Quantity must be greater than 0</span>
                        ) : (
                          <span>⚠️ Exceeds stock ({availableStock} available{otherLinesQty > 0 ? `, ${otherLinesQty} in other lines` : ''})</span>
                        )}
                      </div>
                    )}
                    {canDiscount && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                        <span className="font-medium text-ink">Disc:</span>
                        <div className="flex items-center rounded border border-border-soft bg-white px-1.5 py-0.5 focus-within:border-gold">
                          <span className="text-[11px] text-ink-muted mr-1 font-semibold">₹</span>
                          <input
                            type="number"
                            min="0"
                            max={line.gross}
                            step="any"
                            placeholder="0.00"
                            value={line.discount_amount ?? ''}
                            onChange={(e) => updateLine(line.key, { discount_amount: e.target.value })}
                            onBlur={() => {
                              const num = Number(line.discount_amount);
                              if (num > line.gross) {
                                updateLine(line.key, { discount_amount: String(line.gross) });
                              } else if (num < 0) {
                                updateLine(line.key, { discount_amount: '0' });
                              }
                            }}
                            className="w-14 bg-transparent text-right text-xs text-ink outline-none"
                            title="Discount Amount in ₹"
                          />
                        </div>

                        <div className="flex items-center rounded border border-border-soft bg-white px-1.5 py-0.5 focus-within:border-gold">
                          <span className="text-[11px] text-ink-muted mr-1 font-semibold">%</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            placeholder="0"
                            value={line.discount_percent ?? ''}
                            onChange={(e) => updateLine(line.key, { discount_percent: e.target.value })}
                            onBlur={() => {
                              const num = Number(line.discount_percent);
                              if (num > 100) {
                                updateLine(line.key, { discount_percent: '100' });
                              } else if (num < 0) {
                                updateLine(line.key, { discount_percent: '0' });
                              }
                            }}
                            className="w-11 bg-transparent text-right text-xs text-ink outline-none"
                            title="Discount Percentage"
                          />
                        </div>

                        {isFreeQtyAllowed && (
                          <div className="flex items-center gap-1 ml-auto sm:ml-1">
                            <span>Free:</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={line.free_qty}
                              onChange={(e) => updateLine(line.key, { free_qty: e.target.value })}
                              className={`w-12 rounded border px-1 py-0.5 text-right ${
                                isLineOverstock && requestedFree > 0 ? 'border-danger bg-danger/10 text-danger font-bold' : 'border-border-soft'
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
              })}
              {cart.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-ink-muted">
                  <PackageX size={28} className="text-ink-muted/40" />
                  Cart is empty — scan or search an item, or tap a product.
                </div>
              )}
            </div>

            <SummaryRow label="Subtotal" value={totals.subtotal} />
            <SummaryRow label={`GST Total${uniformTaxPercent ? ` (${uniformTaxPercent}%)` : ''}`} value={totals.cgst + totals.sgst + totals.cessAmount} />
            {canDiscount && (
              <div className="flex items-center justify-between py-1 text-sm text-ink-muted">
                <span className="flex items-center gap-1.5 font-medium">
                  Discount
                  <div className="flex overflow-hidden rounded border border-border-soft text-xs">
                    <button
                      type="button"
                      onClick={() => setBillDiscountMode('amount')}
                      className={`px-1.5 py-0.5 font-medium ${billDiscountMode === 'amount' ? 'bg-gold text-white' : 'bg-white text-ink-muted'}`}
                    >
                      Rs.
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillDiscountMode('percent')}
                      className={`px-1.5 py-0.5 font-medium ${billDiscountMode === 'percent' ? 'bg-gold text-white' : 'bg-white text-ink-muted'}`}
                    >
                      %
                    </button>
                  </div>
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={billDiscount}
                  onChange={(e) => setBillDiscount(e.target.value)}
                  className="w-20 rounded border border-border-soft px-2 py-0.5 text-right font-semibold text-ink"
                />
              </div>
            )}
            <SummaryRow label="Round off" value={totals.roundOff} />

            <div className="mt-2 flex items-center justify-between rounded-lg bg-highlight px-3 py-2.5">
              <span className="font-bold text-ink">Total Amount</span>
              <span className="text-xl font-bold text-ink">Rs. {totals.grandTotal.toFixed(2)}</span>
            </div>

            {!cartValidation.isValid && cart.length > 0 && (
              <div className="mt-2 rounded-lg border border-danger/30 bg-danger/10 p-2 text-xs text-danger font-medium">
                <div className="font-semibold">⚠️ Stock validation error:</div>
                <div className="mt-0.5">{cartValidation.errors[0]?.reason}</div>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              className="mt-4 w-full"
              onClick={handleProceedToPayment}
              disabled={cart.length === 0 || !cartValidation.isValid}
              shortcut="Ctrl+S"
            >
              {isQuickSale ? 'Quick Checkout (Pay)' : 'Proceed to Payment'}
            </Button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => saveMutation.mutate()} disabled={cart.length === 0 || saveMutation.isPending}>
                Hold Bill
              </Button>
              <Button variant="secondary" onClick={resetBill} disabled={cart.length === 0}>
                Clear
              </Button>
            </div>
          </Card>
        </div>
      </div>

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
          error={completeMutation.isError ? completeMutation.error?.response?.data?.error || completeMutation.error?.message || 'Failed to complete' : null}
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
          onGenerateBill={handleGenerateBillFromQuickSale}
          isGenerating={quickSaleGenerateMutation.isPending}
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
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto card p-5">
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold text-ink">{isQuickSale ? 'Quick Sale Payment' : 'Payment'}</div>
            {isQuickSale && (
              <span className="rounded bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">
                Quick Sale
              </span>
            )}
          </div>
          <div className="text-xs text-ink-muted">{customerName || (isQuickSale ? 'Quick Sale (Walk-in / Guest)' : 'Walk-in Customer')} · {itemCount} item(s)</div>
        </div>

        {canDiscount && (
          <div className="mb-3 rounded-lg border border-border-soft bg-page p-2.5">
            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-ink-muted">
              <span>Bill Discount</span>
              <div className="flex overflow-hidden rounded border border-border-soft text-xs">
                <button
                  type="button"
                  onClick={() => setBillDiscountMode('amount')}
                  className={`px-2 py-0.5 font-medium ${billDiscountMode === 'amount' ? 'bg-gold text-white' : 'bg-white text-ink-muted'}`}
                >
                  Rs.
                </button>
                <button
                  type="button"
                  onClick={() => setBillDiscountMode('percent')}
                  className={`px-2 py-0.5 font-medium ${billDiscountMode === 'percent' ? 'bg-gold text-white' : 'bg-white text-ink-muted'}`}
                >
                  %
                </button>
              </div>
            </div>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Enter discount amount..."
              value={billDiscount}
              onChange={(e) => setBillDiscount(e.target.value)}
              className="input font-semibold text-ink"
            />
          </div>
        )}

        <div className="mb-4 rounded-lg bg-highlight px-3 py-3 text-center">
          <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">Total Payable</div>
          <div className="text-2xl font-bold text-ink">Rs. {grandTotal.toFixed(2)}</div>
        </div>

        <div className="mb-3 flex overflow-hidden rounded-lg border border-border-soft bg-page p-1 text-sm">
          <button onClick={() => toggleSplit(false)} className={`flex-1 rounded px-3 py-1.5 font-medium ${!splitMode ? 'bg-white shadow-sm text-ink' : 'text-ink-muted'}`}>
            Single Payment
          </button>
          <button onClick={() => toggleSplit(true)} className={`flex-1 rounded px-3 py-1.5 font-medium ${splitMode ? 'bg-white shadow-sm text-ink' : 'text-ink-muted'}`}>
            Split Payment
          </button>
        </div>

        {!splitMode ? (
          <>
            <div className="mb-1 text-xs font-medium text-ink-muted">Payment Method</div>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setPayments((prev) => [{ ...prev[0], payment_method: m.key }])}
                  className={`rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors ${
                    singleMethod === m.key ? 'border-gold bg-gold/10 text-gold' : 'border-border-soft bg-white text-ink-muted hover:bg-page'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="mb-1 text-xs font-medium text-ink-muted">Amount</div>
            <input
              type="number"
              min="0"
              step="any"
              value={singleAmount}
              onChange={(e) => setSingleAmount(e.target.value)}
              className="input mb-3 text-lg font-semibold"
            />
          </>
        ) : (
          <div className="mb-3 flex flex-col gap-2">
            {PAYMENT_METHODS.map((m) => (
              <div key={m.key} className="flex items-center justify-between gap-2">
                <span className="w-14 text-sm font-medium text-ink">{m.label}</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={getAmount(m.key)}
                  onChange={(e) => setSplitAmount(m.key, e.target.value)}
                  className="input flex-1 text-right"
                />
              </div>
            ))}
          </div>
        )}

        <div className="mb-1 flex justify-between text-sm text-ink-muted">
          <span>Subtotal</span><span>Rs. {totals.subtotal.toFixed(2)}</span>
        </div>
        {totals.discountAmount > 0 && (
          <div className="mb-1 flex justify-between text-sm text-ink-muted">
            <span>Discount</span><span className="text-danger font-medium">- Rs. {totals.discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="mb-1 flex justify-between text-sm text-ink-muted">
          <span>Total Bill</span><span>Rs. {grandTotal.toFixed(2)}</span>
        </div>
        <div className="mb-1 flex justify-between text-sm text-ink-muted">
          <span>Paid</span><span className="font-medium text-ink">Rs. {paymentsTotal.toFixed(2)}</span>
        </div>
        <div className={`mb-3 flex justify-between rounded-lg px-3 py-2 text-sm font-semibold ${remaining > 0.009 ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success'}`}>
          <span>{remaining > 0.009 ? 'Remaining (on credit)' : 'Fully Paid'}</span>
          <span>Rs. {Math.max(remaining, 0).toFixed(2)}</span>
        </div>

        {blockedNoCustomer && (
          <p className="mb-2 text-xs text-danger">Select a customer above to allow a partial/credit payment — a walk-in sale must be paid in full.</p>
        )}
        {!isValid && (
          <p className="mb-2 text-xs font-semibold text-danger">⚠️ Cannot complete payment: one or more items exceed available stock.</p>
        )}
        {error && <p className="mb-2 text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onBack} disabled={isPending}>Back</Button>
          <Button onClick={onPay} disabled={isPending || blockedNoCustomer || !isValid}>Pay Now</Button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between py-0.5 text-sm text-ink-muted">
      <span>{label}</span>
      <span className="text-ink">{Number(value).toFixed(2)}</span>
    </div>
  );
}
