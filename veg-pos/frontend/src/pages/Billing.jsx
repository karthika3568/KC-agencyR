import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listItems } from '../api/items';
import { listParties, getParty } from '../api/parties';
import { listPaymentMethods } from '../api/payments';
import { createBill, listHeldBills, holdBill, deleteHeldBill } from '../api/bills';
import { formatINR, todayISO } from '../utils/format';
import QuickSale from './QuickSale';

const emptyCart = () => ({
  locationType: 'local',
  billType: 'normal',
  partyId: '',
  walkinName: '',
  billDate: todayISO(),
  lines: [],
  discountPercent: '',
  discountAmount: 0,
  commissionMode: 'percentage',
  commissionPercent: 10,
  commissionAmount: 0,
  patthu: 0,
  cooli: 0,
  vadagai: 0,
  otherDeduction: 0,
  paidAmount: 0,
  paymentMethodId: '',
  notes: '',
});

export default function Billing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentMode = searchParams.get('mode') === 'quick' ? 'quick' : 'standard';

  const [items, setItems] = useState([]);
  const [parties, setParties] = useState([]);
  const [methods, setMethods] = useState([]);
  const [cart, setCart] = useState(emptyCart());
  const [previousBalance, setPreviousBalance] = useState(0);
  const [codeInput, setCodeInput] = useState('');
  const [heldOpen, setHeldOpen] = useState(false);
  const [heldBills, setHeldBills] = useState([]);
  const [saving, setSaving] = useState(false);
  const codeRef = useRef(null);

  useEffect(() => {
    listItems({ active_only: '1' }).then(setItems);
    listParties().then(setParties);
    listPaymentMethods().then((m) => {
      setMethods(m);
      const def = m.find((x) => x.is_default);
      if (def) setCart((c) => ({ ...c, paymentMethodId: def.id }));
    });
  }, []);

  useEffect(() => {
    if (!cart.partyId) {
      setPreviousBalance(0);
      return;
    }
    getParty(cart.partyId).then((p) => setPreviousBalance(Number(p.balance || 0)));
  }, [cart.partyId]);

  function addItemByCode(code) {
    const match = items.find((i) => i.code.toLowerCase() === code.trim().toLowerCase());
    if (!match) return;
    setCart((c) => ({
      ...c,
      lines: [
        ...c.lines,
        {
          key: Date.now() + Math.random(),
          item_id: match.id,
          item_name_ta: match.name_ta,
          item_name_en: match.name_en,
          unit: match.unit || 'kg',
          is_charge_item: !!match.is_charge_item,
          rate: match.default_rate || 0,
          nos: match.is_charge_item ? 1 : 0,
          weight: 0,
        },
      ],
    }));
    setCodeInput('');
  }

  function updateLine(key, field, value) {
    setCart((c) => ({
      ...c,
      lines: c.lines.map((l) => (l.key === key ? { ...l, [field]: value } : l)),
    }));
  }

  function removeLine(key) {
    setCart((c) => ({ ...c, lines: c.lines.filter((l) => l.key !== key) }));
  }

  function lineAmount(l) {
    const rate = Number(l.rate) || 0;
    return l.is_charge_item ? rate * (Number(l.nos) || 0) : rate * (Number(l.weight) || 0);
  }

  const itemsTotal = cart.lines.reduce((s, l) => s + lineAmount(l), 0);

  let discountAmount = 0;
  if (cart.discountPercent !== '' && cart.discountPercent !== null) {
    discountAmount = (itemsTotal * Number(cart.discountPercent)) / 100;
  } else {
    discountAmount = Number(cart.discountAmount) || 0;
  }

  // Total Item Sales — left panel. Never includes commission/Pattru/Cooli/Vadagai.
  const grossTotal = itemsTotal;
  const isFixedCommission = cart.commissionMode === 'fixed';
  const commissionAmount = isFixedCommission
    ? Number(cart.commissionAmount) || 0
    : (grossTotal * (Number(cart.commissionPercent) || 0)) / 100;
  const otherDeduction = Number(cart.otherDeduction) || 0;
  // Commission Side Total = Commission + Pattru + Cooli + Vadagai + Other Deductions.
  const totalDeductions = commissionAmount + (Number(cart.patthu) || 0) + (Number(cart.cooli) || 0) + (Number(cart.vadagai) || 0) + otherDeduction;
  // Final Total = Total Item Sales − Commission Side Total.
  const netTotal = grossTotal - totalDeductions;
  const deductionsExceedSales = totalDeductions > grossTotal + 0.009;

  const todayTotal = itemsTotal - discountAmount;
  const grandTotal = todayTotal + previousBalance;

  const paid = Number(cart.paidAmount) || 0;
  const isCommission = cart.billType === 'commission';
  const finalTotal = isCommission ? netTotal : grandTotal;
  const balanceDue = finalTotal - paid;
  const canSave = !isCommission || !deductionsExceedSales;

  function buildPayload() {
    return {
      location_type: cart.locationType,
      bill_type: cart.billType,
      party_id: cart.partyId || null,
      walkin_name: cart.partyId ? null : cart.walkinName || null,
      bill_date: cart.billDate,
      lines: cart.lines.map((l) => ({
        item_id: l.item_id,
        item_name_ta: l.item_name_ta,
        item_name_en: l.item_name_en,
        unit: l.unit || 'kg',
        is_charge_item: l.is_charge_item,
        rate: Number(l.rate) || 0,
        nos: Number(l.nos) || 0,
        weight: Number(l.weight) || 0,
      })),
      discount_percent: cart.discountPercent === '' ? null : Number(cart.discountPercent),
      discount_amount: cart.discountPercent === '' ? Number(cart.discountAmount) || 0 : undefined,
      commission_mode: isCommission ? cart.commissionMode : undefined,
      commission_percent: isCommission && !isFixedCommission ? Number(cart.commissionPercent) || 0 : null,
      commission_amount: isCommission && isFixedCommission ? Number(cart.commissionAmount) || 0 : undefined,
      patthu_amount: Number(cart.patthu) || 0,
      cooli_amount: Number(cart.cooli) || 0,
      vadagai_amount: Number(cart.vadagai) || 0,
      other_deduction_amount: isCommission ? otherDeduction : undefined,
      paid_amount: paid,
      payment_method_id: cart.paymentMethodId || null,
      notes: cart.notes || null,
    };
  }

  const resetCart = useCallback(() => {
    setCart(emptyCart());
    setPreviousBalance(0);
  }, []);

  async function handleSave(andPrint) {
    if (cart.lines.length === 0) {
      alert('Add at least one line');
      return;
    }
    if (!canSave) {
      alert(t('billing.validation_exceeds'));
      return;
    }
    setSaving(true);
    try {
      const bill = await createBill(buildPayload());
      resetCart();
      if (andPrint) {
        navigate(`/print/bill/${bill.id}`);
      } else {
        alert(`Saved: ${bill.bill_no}`);
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleHold() {
    await holdBill({
      label: cart.partyId ? parties.find((p) => p.id === Number(cart.partyId))?.name : cart.walkinName,
      cart,
      location_type: cart.locationType,
      bill_type: cart.billType,
      party_id: cart.partyId || null,
    });
    resetCart();
  }

  async function openHeld() {
    const rows = await listHeldBills();
    setHeldBills(rows);
    setHeldOpen(true);
  }

  function resumeHeld(row) {
    setCart(row.cart);
    setHeldOpen(false);
  }

  async function removeHeld(id) {
    await deleteHeldBill(id);
    setHeldBills((rows) => rows.filter((r) => r.id !== id));
  }

  useEffect(() => {
    if (currentMode === 'quick') return;
    function onKey(e) {
      if (e.key === 'F2') {
        e.preventDefault();
        handleHold();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleSave(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, currentMode]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex p-1 bg-gray-100 rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className={`px-3.5 py-1.5 rounded-md text-sm font-semibold transition-all ${
                currentMode !== 'quick'
                  ? 'bg-white text-brand-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('nav.billing')}
            </button>
            <button
              type="button"
              onClick={() => setSearchParams({ mode: 'quick' })}
              className={`px-3.5 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5 ${
                currentMode === 'quick'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>⚡</span>
              <span>{t('nav.quick_sale')}</span>
            </button>
          </div>
        </div>

        {currentMode !== 'quick' && (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={openHeld}>
              {t('billing.held_bills')}
            </button>
            <button className="btn-secondary" onClick={resetCart}>
              {t('billing.new_bill')}
            </button>
          </div>
        )}
      </div>

      {currentMode === 'quick' ? (
        <QuickSale embedded />
      ) : (
        <>
          <div className="card space-y-3">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Location</label>
            <select className="input" value={cart.locationType} onChange={(e) => setCart({ ...cart, locationType: e.target.value })}>
              <option value="local">{t('billing.location_local')}</option>
              <option value="distant">{t('billing.location_distant')}</option>
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={cart.billType} onChange={(e) => setCart({ ...cart, billType: e.target.value })}>
              <option value="normal">{t('billing.type_normal')}</option>
              <option value="commission">{t('billing.type_commission')}</option>
            </select>
          </div>
          <div>
            <label className="label">{t('common.date')}</label>
            <input type="date" className="input" value={cart.billDate} onChange={(e) => setCart({ ...cart, billDate: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('billing.select_party')}</label>
            <select className="input" value={cart.partyId} onChange={(e) => setCart({ ...cart, partyId: e.target.value })}>
              <option value="">{t('common.walkin')}</option>
              {parties
                .filter((p) => (isCommission ? p.type !== 'customer' : true))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        {!cart.partyId && (
          <input
            className="input max-w-sm"
            placeholder={t('common.walkin') + ' ' + t('common.name')}
            value={cart.walkinName}
            onChange={(e) => setCart({ ...cart, walkinName: e.target.value })}
          />
        )}
      </div>

      <div className="card">
        <div className="flex gap-2 mb-3">
          <input
            ref={codeRef}
            className="input max-w-xs font-mono uppercase"
            placeholder={t('items.code') + '...'}
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addItemByCode(codeInput);
              }
            }}
          />
          <span className="text-xs text-gray-400 self-center">{t('billing.add_line')}</span>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>{t('billing.item')}</th>
              <th>{t('billing.rate')}</th>
              <th>{t('billing.nos')}</th>
              <th>{t('billing.qty')}</th>
              <th>{t('billing.amount')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cart.lines.map((l) => (
              <tr key={l.key}>
                <td>
                  {l.item_name_ta} <span className="text-gray-400 text-xs">({l.item_name_en})</span>
                </td>
                <td>
                  <input className="input w-20" type="number" step="0.01" value={l.rate} onChange={(e) => updateLine(l.key, 'rate', e.target.value)} />
                </td>
                <td>
                  <input className="input w-16" type="number" step="0.01" value={l.nos} onChange={(e) => updateLine(l.key, 'nos', e.target.value)} />
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <input
                      className="input w-20"
                      type="number"
                      step="0.01"
                      disabled={l.is_charge_item}
                      value={l.weight}
                      onChange={(e) => updateLine(l.key, 'weight', e.target.value)}
                    />
                    {!l.is_charge_item && <span className="text-xs text-gray-400">{l.unit || 'kg'}</span>}
                  </div>
                </td>
                <td className="font-semibold">{formatINR(lineAmount(l))}</td>
                <td>
                  <button className="text-red-600" onClick={() => removeLine(l.key)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {cart.lines.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-4">
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card space-y-2">
          <h3 className="font-semibold">{isCommission ? t('billing.gross_total') : t('billing.items_total')}</h3>
          <Row label={t('billing.items_total')} value={formatINR(itemsTotal)} />

          {!isCommission && (
            <>
              <div className="flex items-center justify-between">
                <label className="label mb-0">{t('billing.discount')}</label>
                <div className="flex gap-2">
                  <input
                    className="input w-24"
                    type="number"
                    placeholder="%"
                    value={cart.discountPercent}
                    onChange={(e) => setCart({ ...cart, discountPercent: e.target.value })}
                  />
                  <input
                    className="input w-28"
                    type="number"
                    placeholder="₹"
                    disabled={cart.discountPercent !== ''}
                    value={cart.discountPercent !== '' ? discountAmount.toFixed(2) : cart.discountAmount}
                    onChange={(e) => setCart({ ...cart, discountAmount: e.target.value })}
                  />
                </div>
              </div>
              <Row label={t('billing.previous_balance')} value={formatINR(previousBalance)} />
              <Row label={t('billing.grand_total')} value={formatINR(grandTotal)} bold />
            </>
          )}

          {isCommission && (
            <>
              <div>
                <label className="label mb-1">{t('billing.commission_mode')}</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    className={cart.commissionMode === 'percentage' ? 'btn-primary flex-1' : 'btn-secondary flex-1'}
                    onClick={() => setCart({ ...cart, commissionMode: 'percentage' })}
                  >
                    {t('billing.commission_mode_percentage')}
                  </button>
                  <button
                    type="button"
                    className={cart.commissionMode === 'fixed' ? 'btn-primary flex-1' : 'btn-secondary flex-1'}
                    onClick={() => setCart({ ...cart, commissionMode: 'fixed' })}
                  >
                    {t('billing.commission_mode_fixed')}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="label mb-0">{t('billing.commission')}</label>
                {cart.commissionMode === 'percentage' ? (
                  <input
                    className="input w-28"
                    type="number"
                    min="0"
                    placeholder="%"
                    value={cart.commissionPercent}
                    onChange={(e) => setCart({ ...cart, commissionPercent: e.target.value })}
                  />
                ) : (
                  <input
                    className="input w-28"
                    type="number"
                    min="0"
                    placeholder="₹"
                    value={cart.commissionAmount}
                    onChange={(e) => setCart({ ...cart, commissionAmount: e.target.value })}
                  />
                )}
              </div>
              {cart.commissionMode === 'percentage' && (
                <Row label={t('billing.commission') + ' ' + t('billing.amount')} value={formatINR(commissionAmount)} />
              )}
              <NumberRow label={t('billing.patthu')} value={cart.patthu} onChange={(v) => setCart({ ...cart, patthu: v })} />
              <NumberRow label={t('billing.cooli')} value={cart.cooli} onChange={(v) => setCart({ ...cart, cooli: v })} />
              <NumberRow label={t('billing.vadagai')} value={cart.vadagai} onChange={(v) => setCart({ ...cart, vadagai: v })} />
              <NumberRow label={t('billing.other_deduction')} value={cart.otherDeduction} onChange={(v) => setCart({ ...cart, otherDeduction: v })} />
              <Row label={t('billing.commission_side_total')} value={formatINR(totalDeductions)} bold />
              {deductionsExceedSales && (
                <p className="text-red-600 text-sm font-semibold bg-red-50 border border-red-200 rounded p-2">
                  ⚠ {t('billing.validation_exceeds')}
                </p>
              )}
              <Row label={t('billing.net_total')} value={formatINR(netTotal)} bold tone={deductionsExceedSales ? 'red' : undefined} />
            </>
          )}
        </div>

        <div className="card space-y-2">
          <h3 className="font-semibold">{t('billing.payment_method')}</h3>
          <NumberRow label={t('billing.paid_amount')} value={cart.paidAmount} onChange={(v) => setCart({ ...cart, paidAmount: v })} />
          <div className="flex items-center justify-between">
            <label className="label mb-0">{t('billing.payment_method')}</label>
            <select className="input w-40" value={cart.paymentMethodId} onChange={(e) => setCart({ ...cart, paymentMethodId: e.target.value })}>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name_ta}
                </option>
              ))}
            </select>
          </div>
          <Row label={t('billing.balance_due')} value={formatINR(balanceDue)} bold tone={balanceDue > 0 ? 'red' : 'green'} />
          <textarea className="input" placeholder={t('billing.notes')} value={cart.notes} onChange={(e) => setCart({ ...cart, notes: e.target.value })} />

          <div className="flex gap-2 pt-2">
            <button className="btn-secondary flex-1" onClick={handleHold} disabled={saving}>
              {t('billing.hold_bill')}
            </button>
            <button className="btn-secondary flex-1" onClick={() => handleSave(false)} disabled={saving || !canSave}>
              {t('billing.save')}
            </button>
            <button className="btn-primary flex-1" onClick={() => handleSave(true)} disabled={saving || !canSave}>
              {t('billing.save_print')}
            </button>
          </div>
        </div>
      </div>

      <div className="card bg-brand-50 border-brand-200 flex items-center justify-between px-6 py-4">
        <div className="space-x-6 hidden sm:flex text-sm text-gray-600">
          <span>{t('billing.total_item_sales')}: <strong className="text-gray-800">{formatINR(itemsTotal)}</strong></span>
          {isCommission && (
            <span>{t('billing.commission_side_total')}: <strong className="text-gray-800">{formatINR(totalDeductions)}</strong></span>
          )}
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <span className="font-semibold text-gray-700">{t('billing.final_total')}</span>
          <span className={'text-2xl font-bold ' + (deductionsExceedSales ? 'text-red-600' : 'text-brand-700')}>
            {formatINR(finalTotal)}
          </span>
        </div>
      </div>

      {heldOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 no-print p-4">
          <div className="card w-full max-w-lg space-y-3">
            <div className="flex justify-between">
              <h2 className="font-bold text-lg">{t('billing.held_bills')}</h2>
              <button className="btn-secondary" onClick={() => setHeldOpen(false)}>
                {t('common.close')}
              </button>
            </div>
            {heldBills.length === 0 && <p className="text-gray-400 text-sm">—</p>}
            {heldBills.map((row) => (
              <div key={row.id} className="flex items-center justify-between border-b py-2">
                <div>
                  <div className="font-medium">{row.label || t('common.walkin')}</div>
                  <div className="text-xs text-gray-500">{row.cart?.lines?.length || 0} items</div>
                </div>
                <div className="space-x-2">
                  <button className="btn-secondary" onClick={() => resumeHeld(row)}>
                    {t('billing.resume')}
                  </button>
                  <button className="text-red-600 underline" onClick={() => removeHeld(row.id)}>
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

function Row({ label, value, bold, tone }) {
  const toneClass = tone === 'red' ? 'text-red-600' : tone === 'green' ? 'text-brand-700' : '';
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? 'font-semibold' : 'text-sm text-gray-600'}>{label}</span>
      <span className={(bold ? 'font-bold text-lg ' : '') + toneClass}>{value}</span>
    </div>
  );
}

function NumberRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <label className="label mb-0">{label}</label>
      <input className="input w-32" type="number" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
