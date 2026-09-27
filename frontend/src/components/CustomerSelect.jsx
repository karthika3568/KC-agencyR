import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, User, X, ChevronDown, Check, Phone } from 'lucide-react';

const PAGE_SIZE = 20;

export function CustomerSelect({
  customers = [],
  value = '',
  onChange,
  placeholder = 'Search customer by name or phone…',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [page, setPage] = useState(1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Find currently selected customer
  const selectedCustomer = useMemo(() => {
    if (!value) return null;
    return customers.find((c) => String(c.id) === String(value)) || null;
  }, [customers, value]);

  // Sync search term with selected customer when not active/open
  useEffect(() => {
    if (!isOpen) {
      if (selectedCustomer) {
        setSearchTerm(selectedCustomer.ledger_name || selectedCustomer.name || '');
      } else {
        setSearchTerm('');
      }
    }
  }, [selectedCustomer, value, isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter list based on search term
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return customers;

    // If search term matches selected customer's exact name, show all or filtered
    return customers.filter((c) => {
      const name = (c.ledger_name || c.name || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const code = (c.code || '').toLowerCase();
      return name.includes(term) || phone.includes(term) || code.includes(term);
    });
  }, [customers, searchTerm]);

  // Reset highlight index and paging whenever the filter changes — browsing
  // the full customer list (no search term) still needs pages, not one long
  // scroll, once there are more than PAGE_SIZE of them.
  useEffect(() => {
    setHighlightedIndex(0);
    setPage(1);
  }, [searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedCustomers = filteredCustomers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSelect = (customer) => {
    onChange(customer ? customer.id : '');
    if (customer) {
      setSearchTerm(customer.ledger_name || customer.name || '');
    } else {
      setSearchTerm('');
    }
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => Math.min(prev + 1, pagedCustomers.length - 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && pagedCustomers.length > 0) {
        const item = pagedCustomers[highlightedIndex] || pagedCustomers[0];
        if (item) {
          handleSelect(item);
        }
      } else if (!isOpen) {
        setIsOpen(true);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative min-w-[240px] flex-1 ${className}`}>
      <div className="relative flex items-center">
        <Search size={15} className="pointer-events-none absolute left-3 text-ink-muted z-10" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onClick={() => {
            setIsOpen(true);
            // Select text on click for easy replacement if needed
            if (selectedCustomer && searchTerm === (selectedCustomer.ledger_name || selectedCustomer.name)) {
              inputRef.current?.select();
            }
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`input pl-9 pr-8 w-full text-sm font-medium transition-all ${
            selectedCustomer ? 'border-gold bg-gold/5 font-semibold text-gold-dark' : ''
          }`}
        />

        {value ? (
          <button
            type="button"
            onClick={handleClear}
            title="Clear customer selection (revert to Walk-in)"
            className="absolute right-2.5 p-1 text-ink-muted hover:text-danger rounded-full transition-colors"
          >
            <X size={14} />
          </button>
        ) : (
          <ChevronDown
            size={14}
            className={`absolute right-2.5 text-ink-muted pointer-events-none transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-border-soft bg-white shadow-xl py-1">
          <div className="max-h-64 overflow-y-auto">
          {filteredCustomers.length === 0 ? (
            <div className="px-3 py-2 text-xs text-ink-muted text-center">No customers found</div>
          ) : (
            pagedCustomers.map((c, index) => {
              const isSelected = String(c.id) === String(value);
              const isHighlighted = index === highlightedIndex;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                    isHighlighted ? 'bg-gold/10 text-gold-dark' : 'hover:bg-page'
                  } ${isSelected ? 'font-semibold bg-gold/15' : ''}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <User size={14} className={isSelected ? 'text-gold' : 'text-ink-muted'} />
                    <span className="truncate">{c.ledger_name || c.name}</span>
                    {c.phone && (
                      <span className="flex items-center gap-1 text-xs text-ink-muted">
                        <Phone size={11} />
                        {c.phone}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check size={14} className="text-gold shrink-0 ml-2" />}
                </button>
              );
            })
          )}
          </div>
          {filteredCustomers.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-border-soft px-2 py-1.5 text-xs">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                disabled={currentPage === 1}
                className="rounded px-2 py-1 text-ink-muted hover:bg-page disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-ink-muted">Page {currentPage} of {totalPages} · {filteredCustomers.length} customers</span>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                disabled={currentPage === totalPages}
                className="rounded px-2 py-1 text-ink-muted hover:bg-page disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
