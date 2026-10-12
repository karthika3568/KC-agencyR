import client from './client';

export const dashboardSummary = () => client.get('/dashboard/summary').then((r) => r.data);

export const dailySalesReport = (params) => client.get('/reports/daily-sales', { params }).then((r) => r.data);
export const itemWiseSalesReport = (params) => client.get('/reports/item-wise-sales', { params }).then((r) => r.data);
export const topItemsReport = (params) => client.get('/reports/top-items', { params }).then((r) => r.data);
export const partyOutstandingReport = (params) => client.get('/reports/party-outstanding', { params }).then((r) => r.data);
export const commissionReport = (params) => client.get('/reports/commission', { params }).then((r) => r.data);
export const paymentCollectionReport = (params) => client.get('/reports/payment-collection', { params }).then((r) => r.data);
export const purchaseReport = (params) => client.get('/reports/purchases', { params }).then((r) => r.data);
export const profitReport = (params) => client.get('/reports/profit', { params }).then((r) => r.data);
export const billWiseProfitReport = (params) => client.get('/reports/bill-wise-profit', { params }).then((r) => r.data);
