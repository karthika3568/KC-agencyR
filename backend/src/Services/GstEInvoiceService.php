<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

/**
 * GST E-Invoice (IRN) + E-Way Bill generation (section 10 of the GST
 * integration requirement).
 *
 * IMPORTANT — this is a real integration *layer*, not a real integration:
 * no GSP (GST Suvidha Provider) account/credentials exist in this project.
 * Every generate*() call below checks isConfigured() FIRST and returns a
 * structured failure — naming exactly which GST_API_* env vars are missing
 * — before ever attempting a network call. Nothing here ever fabricates an
 * IRN, ack number, QR code, or EWB number. When GST_API_ENABLED=true and
 * every credential is present, it makes a real HTTP POST built from this
 * invoice's own data, mapped to the fields the NIC e-invoice schema
 * publishes (Version/TranDtls/DocDtls/SellerDtls/BuyerDtls/ItemList/
 * ValDtls) — that schema is public, but the exact endpoint path, auth
 * handshake, and response envelope differ by GSP and have NOT been tested
 * against any live provider. Treat the request-building here as a
 * documented starting point to adapt to whichever GSP you actually
 * contract with, not a certified integration.
 */
class GstEInvoiceService
{
    private array $config;

    public function __construct(private PDO $pdo)
    {
        $full = require __DIR__ . '/../../config/config.php';
        $this->config = $full['gst_api'];
    }

    public function isConfigured(): bool
    {
        return $this->missingConfigKeys() === [];
    }

    /** @return string[] names of GST_API_* env vars that still need a real value. */
    private function missingConfigKeys(): array
    {
        if (!$this->config['enabled']) {
            return ['GST_API_ENABLED (currently false)'];
        }
        $required = [
            'base_url' => 'GST_API_BASE_URL',
            'username' => 'GST_API_USERNAME',
            'password' => 'GST_API_PASSWORD',
            'seller_gstin' => 'GST_API_SELLER_GSTIN',
        ];
        $missing = [];
        foreach ($required as $key => $envName) {
            if (trim((string) $this->config[$key]) === '') {
                $missing[] = $envName;
            }
        }
        return $missing;
    }

    /**
     * Mechanically-checkable eligibility only (GST bill, a real buyer GSTIN,
     * a completed invoice, not already generated). Whether this specific
     * transaction is *legally required* to carry an e-invoice depends on
     * the seller's aggregate turnover and the current GST Council
     * notification thresholds — that is a business/legal determination
     * this app cannot verify on its own, so it is never assumed true.
     * Generation is always an explicit user action (a button), never
     * automatic just because a GSTIN is present.
     */
    public function checkEinvoiceEligibility(array $invoice, ?array $customer): array
    {
        $reasons = [];
        if (($invoice['status'] ?? null) !== 'completed') {
            $reasons[] = 'Invoice must be completed (not held/cancelled) before generating an e-invoice.';
        }
        if (($invoice['bill_type'] ?? null) !== 'gst') {
            $reasons[] = 'E-Invoice only applies to GST bills, not Non-GST/estimate bills.';
        }
        if (empty($customer['gstin'] ?? null)) {
            $reasons[] = 'Customer has no GSTIN on file — e-invoice requires a registered B2B buyer.';
        }
        if (($invoice['einvoice_status'] ?? 'not_generated') === 'generated') {
            $reasons[] = 'An e-invoice (IRN) already exists for this invoice.';
        }
        return ['eligible' => empty($reasons), 'reasons' => $reasons];
    }

    public function checkEwayBillEligibility(array $invoice, ?array $customer): array
    {
        $reasons = [];
        if (($invoice['status'] ?? null) !== 'completed') {
            $reasons[] = 'Invoice must be completed before generating an E-Way Bill.';
        }
        if (($invoice['bill_type'] ?? null) !== 'gst') {
            $reasons[] = 'E-Way Bill only applies to GST bills.';
        }
        // The statutory E-Way Bill threshold (currently ₹50,000 consignment
        // value in most states) is a real legal rule, not a guess — but
        // state-specific variations exist, so this blocks obviously-under-
        // threshold attempts without claiming to be the authority on every
        // state's exact rule.
        if ((float) ($invoice['grand_total'] ?? 0) < 50000) {
            $reasons[] = 'Consignment value is under ₹50,000 — confirm your state\'s E-Way Bill threshold before generating one anyway.';
        }
        if (($invoice['eway_bill_status'] ?? 'not_generated') === 'generated') {
            $reasons[] = 'An E-Way Bill already exists for this invoice.';
        }
        return ['eligible' => empty($reasons), 'reasons' => $reasons];
    }

    /**
     * @return array{success:bool, irn?:string, ack_no?:string, ack_date?:string, qr_code?:string, error?:string, raw_response?:string}
     */
    public function generateEInvoice(array $invoice, array $items, ?array $customer, array $branch): array
    {
        $missing = $this->missingConfigKeys();
        if ($missing !== []) {
            return $this->notConfiguredResult($missing);
        }

        $payload = $this->buildEInvoicePayload($invoice, $items, $customer, $branch);
        $path = $this->config['base_url'] . '/eicore/v1.03/Invoice';

        return $this->callProvider('POST', $path, $payload, function (array $body) {
            // NIC schema convention: Status "1" = success, Irn/AckNo/AckDt/
            // SignedQRCode in the response body. A different GSP's wrapper
            // will differ — this is the documented starting shape, not a
            // guarantee.
            if (($body['Status'] ?? $body['status'] ?? null) == '1' && !empty($body['Irn'] ?? $body['irn'] ?? null)) {
                return [
                    'success' => true,
                    'irn' => (string) ($body['Irn'] ?? $body['irn']),
                    'ack_no' => (string) ($body['AckNo'] ?? $body['ack_no'] ?? ''),
                    'ack_date' => (string) ($body['AckDt'] ?? $body['ack_date'] ?? ''),
                    'qr_code' => (string) ($body['SignedQRCode'] ?? $body['qr_code'] ?? ''),
                ];
            }
            $errorMessage = $body['ErrorDetails'][0]['ErrorMessage']
                ?? $body['error'] ?? $body['message'] ?? 'Provider rejected the request (unrecognized response shape).';
            return ['success' => false, 'error' => is_string($errorMessage) ? $errorMessage : json_encode($errorMessage)];
        });
    }

    public function cancelEInvoice(array $invoice, string $reason): array
    {
        $missing = $this->missingConfigKeys();
        if ($missing !== []) {
            return $this->notConfiguredResult($missing);
        }
        if (empty($invoice['irn'])) {
            return ['success' => false, 'error' => 'No IRN on this invoice to cancel.'];
        }
        $payload = ['Irn' => $invoice['irn'], 'CnlRsn' => '1', 'CnlRem' => substr($reason, 0, 100)];
        $path = $this->config['base_url'] . '/eicore/v1.03/Invoice/Cancel';

        return $this->callProvider('POST', $path, $payload, function (array $body) {
            if (($body['Status'] ?? $body['status'] ?? null) == '1') {
                return ['success' => true];
            }
            $errorMessage = $body['ErrorDetails'][0]['ErrorMessage'] ?? $body['error'] ?? 'Provider rejected the cancellation.';
            return ['success' => false, 'error' => is_string($errorMessage) ? $errorMessage : json_encode($errorMessage)];
        });
    }

    /**
     * @return array{success:bool, eway_bill_no?:string, eway_bill_date?:string, valid_until?:string, error?:string, raw_response?:string}
     */
    public function generateEWayBill(array $invoice, array $items, ?array $customer, array $branch): array
    {
        $missing = $this->missingConfigKeys();
        if ($missing !== []) {
            return $this->notConfiguredResult($missing);
        }
        if (empty($invoice['irn']) && empty($invoice['transporter_name'])) {
            return ['success' => false, 'error' => 'E-Way Bill needs either an existing IRN (invoice reference) or transporter details — provide transporter name/GSTIN and distance first.'];
        }

        $payload = $this->buildEWayBillPayload($invoice, $items, $customer, $branch);
        $path = $this->config['base_url'] . '/ewaybillapi/v1.03/ewayapi';

        return $this->callProvider('POST', $path, $payload, function (array $body) {
            if (!empty($body['ewayBillNo'] ?? $body['EwbNo'] ?? null)) {
                return [
                    'success' => true,
                    'eway_bill_no' => (string) ($body['ewayBillNo'] ?? $body['EwbNo']),
                    'eway_bill_date' => (string) ($body['ewayBillDate'] ?? $body['EwbDt'] ?? ''),
                    'valid_until' => (string) ($body['validUpto'] ?? $body['EwbValidTill'] ?? ''),
                ];
            }
            $errorMessage = $body['error'] ?? $body['message'] ?? 'Provider rejected the request (unrecognized response shape).';
            return ['success' => false, 'error' => is_string($errorMessage) ? $errorMessage : json_encode($errorMessage)];
        });
    }

    public function cancelEWayBill(array $invoice, string $reason): array
    {
        $missing = $this->missingConfigKeys();
        if ($missing !== []) {
            return $this->notConfiguredResult($missing);
        }
        if (empty($invoice['eway_bill_no'])) {
            return ['success' => false, 'error' => 'No E-Way Bill number on this invoice to cancel.'];
        }
        $payload = ['ewbNo' => $invoice['eway_bill_no'], 'cancelRsnCode' => '1', 'cancelRmrk' => substr($reason, 0, 100)];
        $path = $this->config['base_url'] . '/ewaybillapi/v1.03/ewayapi/cancel';

        return $this->callProvider('POST', $path, $payload, function (array $body) {
            if (($body['success'] ?? false) === true || ($body['status'] ?? null) === 'CANCELLED') {
                return ['success' => true];
            }
            return ['success' => false, 'error' => $body['error'] ?? $body['message'] ?? 'Provider rejected the cancellation.'];
        });
    }

    private function notConfiguredResult(array $missing): array
    {
        return [
            'success' => false,
            'error' => 'GST API is not configured. Set these in backend/.env: ' . implode(', ', $missing),
        ];
    }

    /**
     * Real HTTP call via cURL (no HTTP client dependency exists in this
     * project yet — composer.json has none, and adding one for a single
     * integration that can't be tested here isn't warranted). Basic auth
     * with username/password is the lowest-common-denominator scheme; many
     * GSPs actually require a separate token-fetch step first — that step
     * is provider-specific and not implemented here since there's no real
     * account to verify it against.
     */
    private function callProvider(string $method, string $url, array $payload, callable $parseSuccess): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'client_id: ' . $this->config['client_id'],
                'client_secret: ' . $this->config['client_secret'],
            ],
            CURLOPT_USERPWD => $this->config['username'] . ':' . $this->config['password'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $responseBody = curl_exec($ch);
        $curlError = curl_error($ch);
        $httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($responseBody === false) {
            return ['success' => false, 'error' => 'Could not reach the GST API provider: ' . $curlError];
        }

        $decoded = json_decode((string) $responseBody, true);
        if (!is_array($decoded)) {
            return [
                'success' => false,
                'error' => "Provider returned a non-JSON response (HTTP {$httpStatus}).",
                'raw_response' => substr((string) $responseBody, 0, 2000),
            ];
        }

        $result = $parseSuccess($decoded);
        $result['raw_response'] = substr((string) $responseBody, 0, 4000);
        return $result;
    }

    private function buildEInvoicePayload(array $invoice, array $items, ?array $customer, array $branch): array
    {
        return [
            'Version' => '1.1',
            'TranDtls' => ['TaxSch' => 'GST', 'SupTyp' => 'B2B'],
            'DocDtls' => [
                'Typ' => 'INV',
                'No' => $invoice['invoice_no'],
                'Dt' => date('d/m/Y', strtotime((string) $invoice['invoice_date'])),
            ],
            'SellerDtls' => [
                'Gstin' => $this->config['seller_gstin'],
                'LglNm' => $branch['print_name'] ?? $branch['branch_name'] ?? '',
                'Addr1' => $branch['address_line1'] ?? '',
                'Loc' => $branch['city'] ?? '',
                'Pin' => (int) ($branch['pincode'] ?? 0),
                'Stcd' => $branch['state'] ?? '',
            ],
            'BuyerDtls' => [
                'Gstin' => $customer['gstin'] ?? '',
                'LglNm' => $customer['ledger_name'] ?? '',
                'Addr1' => $customer['address'] ?? '',
                'Pos' => '', // Place of supply state code — needs a real state->code lookup before going live.
            ],
            'ItemList' => array_map(function (array $line, int $i) {
                return [
                    'SlNo' => (string) ($i + 1),
                    'PrdDesc' => $line['item_name_snapshot'] ?? '',
                    'HsnCd' => $line['hsn_snapshot'] ?? '',
                    'Qty' => (float) $line['qty'],
                    'UnitPrice' => (float) $line['rate'],
                    'TotAmt' => (float) ($line['qty'] * $line['rate']),
                    'AssAmt' => (float) $line['line_total'],
                    'GstRt' => (float) $line['tax_percent'],
                    'TotItemVal' => (float) ($line['line_total'] + $line['tax_amount'] + $line['cess_amount']),
                ];
            }, $items, array_keys($items)),
            'ValDtls' => [
                'AssVal' => (float) $invoice['taxable_value'],
                'CgstVal' => (float) $invoice['cgst_amount'],
                'SgstVal' => (float) $invoice['sgst_amount'],
                'IgstVal' => (float) $invoice['igst_amount'],
                'TotInvVal' => (float) $invoice['grand_total'],
            ],
        ];
    }

    private function buildEWayBillPayload(array $invoice, array $items, ?array $customer, array $branch): array
    {
        return [
            'supplyType' => 'O',
            'docType' => 'INV',
            'docNo' => $invoice['invoice_no'],
            'docDate' => date('d/m/Y', strtotime((string) $invoice['invoice_date'])),
            'fromGstin' => $this->config['seller_gstin'],
            'fromPincode' => (int) ($branch['pincode'] ?? 0),
            'toGstin' => $customer['gstin'] ?? '',
            'totalValue' => (float) $invoice['taxable_value'],
            'totInvValue' => (float) $invoice['grand_total'],
            'transporterName' => $invoice['transporter_name'] ?? '',
            'transporterGstin' => $invoice['transporter_gstin'] ?? '',
            'transDistance' => (int) ($invoice['transport_distance_km'] ?? 0),
            'vehicleNo' => $invoice['vehicle_no'] ?? '',
            'itemList' => array_map(fn (array $line) => [
                'productName' => $line['item_name_snapshot'] ?? '',
                'hsnCode' => $line['hsn_snapshot'] ?? '',
                'quantity' => (float) $line['qty'],
                'taxableAmount' => (float) $line['line_total'],
                'gstRate' => (float) $line['tax_percent'],
            ], $items),
        ];
    }
}
