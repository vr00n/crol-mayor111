/**
 * API module for fetching data from NYC Open Data SODA API
 */

const API = {
    BASE_URL: 'https://data.cityofnewyork.us/resource/dg92-zbpx.json',
    PAGE_SIZE: 10000,

    /**
     * Build SoQL query URL
     */
    buildUrl(params = {}) {
        const {
            startDate = '2026-01-01',
            endDate = null,
            minAmount = 0,
            limit = this.PAGE_SIZE,
            offset = 0
        } = params;

        const url = new URL(this.BASE_URL);
        
        // Build WHERE clause
        const conditions = [];
        
        // Date filter
        if (startDate) {
            conditions.push(`start_date >= '${startDate}'`);
        }
        if (endDate) {
            conditions.push(`start_date <= '${endDate}'`);
        }
        
        // Amount filter (contract_amount > 0 by default)
        conditions.push(`contract_amount > ${minAmount}`);
        
        // Only include records that have a vendor_name (awards)
        conditions.push(`vendor_name IS NOT NULL`);
        
        if (conditions.length > 0) {
            url.searchParams.set('$where', conditions.join(' AND '));
        }

        // Select specific fields
        const fields = [
            'request_id',
            'start_date',
            'end_date',
            'agency_name',
            'vendor_name',
            'vendor_address',
            'contract_amount',
            'short_title',
            'type_of_notice_description',
            'category_description',
            'selection_method_description',
            'pin',
            'other_info_1',
            'other_info_2',
            'other_info_3'
        ];
        url.searchParams.set('$select', fields.join(','));

        // Ordering
        url.searchParams.set('$order', 'contract_amount DESC');

        // Pagination
        url.searchParams.set('$limit', limit.toString());
        url.searchParams.set('$offset', offset.toString());

        return url.toString();
    },

    /**
     * Fetch a single page of data
     */
    async fetchPage(params = {}) {
        const url = this.buildUrl(params);
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    },

    /**
     * Fetch all data with pagination
     */
    async fetchAll(params = {}) {
        const allData = [];
        let offset = 0;
        let hasMore = true;
        
        Utils.showLoading();
        
        try {
            while (hasMore) {
                const pageData = await this.fetchPage({
                    ...params,
                    offset,
                    limit: this.PAGE_SIZE
                });
                
                if (pageData.length === 0) {
                    hasMore = false;
                } else {
                    allData.push(...pageData);
                    offset += this.PAGE_SIZE;
                    
                    // Safety limit to prevent infinite loops
                    if (offset > 100000) {
                        console.warn('Reached safety limit of 100,000 records');
                        hasMore = false;
                    }
                    
                    // If we got fewer records than the page size, we're done
                    if (pageData.length < this.PAGE_SIZE) {
                        hasMore = false;
                    }
                }
            }
            
            // Process data to add concatenated additional_info field
            const processedData = this.processData(allData);
            
            return processedData;
        } finally {
            Utils.hideLoading();
        }
    },

    /**
     * Process raw data from API
     */
    processData(data) {
        return data.map(record => ({
            ...record,
            // Convert contract_amount to number
            contract_amount: parseFloat(record.contract_amount) || 0,
            // Concatenate other_info fields
            additional_info: Utils.concatenateOtherInfo(record),
            // Parse dates
            start_date_parsed: record.start_date ? new Date(record.start_date) : null,
            end_date_parsed: record.end_date ? new Date(record.end_date) : null
        }));
    },

    /**
     * Aggregate data for Sankey diagram
     * Returns { nodes: [...], links: [...] }
     */
    aggregateForSankey(data, sortBy = 'amount-desc') {
        // Group by vendor -> agency pairs
        const linkMap = new Map();
        const vendorTotals = new Map();
        const agencyTotals = new Map();
        
        data.forEach(record => {
            const vendor = record.vendor_name || 'Unknown Vendor';
            const agency = record.agency_name || 'Unknown Agency';
            const amount = record.contract_amount || 0;
            
            // Track vendor totals
            vendorTotals.set(vendor, (vendorTotals.get(vendor) || 0) + amount);
            agencyTotals.set(agency, (agencyTotals.get(agency) || 0) + amount);
            
            const key = `${vendor}|||${agency}`;
            if (!linkMap.has(key)) {
                linkMap.set(key, {
                    vendor,
                    agency,
                    amount: 0,
                    count: 0,
                    contracts: []
                });
            }
            
            const link = linkMap.get(key);
            link.amount += amount;
            link.count += 1;
            link.contracts.push(record);
        });
        
        // Sort vendors and agencies based on sortBy
        const [field, direction] = sortBy.split('-');
        const multiplier = direction === 'desc' ? -1 : 1;
        
        let sortedVendors, sortedAgencies;
        
        if (field === 'amount') {
            sortedVendors = Array.from(vendorTotals.entries())
                .sort((a, b) => multiplier * (a[1] - b[1]))
                .map(e => e[0]);
            sortedAgencies = Array.from(agencyTotals.entries())
                .sort((a, b) => multiplier * (a[1] - b[1]))
                .map(e => e[0]);
        } else if (field === 'count') {
            // Count contracts per vendor/agency
            const vendorCounts = new Map();
            const agencyCounts = new Map();
            data.forEach(r => {
                const v = r.vendor_name || 'Unknown Vendor';
                const a = r.agency_name || 'Unknown Agency';
                vendorCounts.set(v, (vendorCounts.get(v) || 0) + 1);
                agencyCounts.set(a, (agencyCounts.get(a) || 0) + 1);
            });
            sortedVendors = Array.from(vendorCounts.entries())
                .sort((a, b) => multiplier * (a[1] - b[1]))
                .map(e => e[0]);
            sortedAgencies = Array.from(agencyCounts.entries())
                .sort((a, b) => multiplier * (a[1] - b[1]))
                .map(e => e[0]);
        } else {
            // Name sort
            sortedVendors = Array.from(vendorTotals.keys())
                .sort((a, b) => multiplier * a.localeCompare(b));
            sortedAgencies = Array.from(agencyTotals.keys())
                .sort((a, b) => multiplier * a.localeCompare(b));
        }
        
        // Create nodes array in sorted order
        const nodes = [];
        const nodeIndex = new Map();
        
        // Add vendors first (left side)
        sortedVendors.forEach(vendor => {
            nodeIndex.set(`vendor:${vendor}`, nodes.length);
            nodes.push({
                name: vendor,
                type: 'vendor',
                id: `vendor:${vendor}`,
                total: vendorTotals.get(vendor)
            });
        });
        
        // Add agencies (right side)
        sortedAgencies.forEach(agency => {
            nodeIndex.set(`agency:${agency}`, nodes.length);
            nodes.push({
                name: agency,
                type: 'agency',
                id: `agency:${agency}`,
                total: agencyTotals.get(agency)
            });
        });
        
        // Create links array
        const links = Array.from(linkMap.values()).map(link => ({
            source: nodeIndex.get(`vendor:${link.vendor}`),
            target: nodeIndex.get(`agency:${link.agency}`),
            value: link.amount,
            count: link.count,
            vendor: link.vendor,
            agency: link.agency,
            contracts: link.contracts
        }));
        
        return { nodes, links };
    },

    /**
     * Aggregate data for Matrix view
     * Returns { vendors: [...], agencies: [...], matrix: [[...]] }
     */
    aggregateForMatrix(data, sortBy = 'amount-desc') {
        // Get unique vendors and agencies with totals
        const vendorTotalsMap = new Map();
        const agencyTotalsMap = new Map();
        const vendorCountsMap = new Map();
        const agencyCountsMap = new Map();
        const matrixMap = new Map();
        
        data.forEach(record => {
            const vendor = record.vendor_name || 'Unknown Vendor';
            const agency = record.agency_name || 'Unknown Agency';
            const amount = record.contract_amount || 0;
            
            vendorTotalsMap.set(vendor, (vendorTotalsMap.get(vendor) || 0) + amount);
            agencyTotalsMap.set(agency, (agencyTotalsMap.get(agency) || 0) + amount);
            vendorCountsMap.set(vendor, (vendorCountsMap.get(vendor) || 0) + 1);
            agencyCountsMap.set(agency, (agencyCountsMap.get(agency) || 0) + 1);
            
            const key = `${vendor}|||${agency}`;
            if (!matrixMap.has(key)) {
                matrixMap.set(key, { amount: 0, count: 0 });
            }
            
            const cell = matrixMap.get(key);
            cell.amount += amount;
            cell.count += 1;
        });
        
        // Sort based on sortBy parameter
        const [field, direction] = sortBy.split('-');
        const multiplier = direction === 'desc' ? -1 : 1;
        
        let vendors, agencies;
        
        if (field === 'amount') {
            vendors = Array.from(vendorTotalsMap.entries())
                .sort((a, b) => multiplier * (a[1] - b[1]))
                .map(e => e[0]);
            agencies = Array.from(agencyTotalsMap.entries())
                .sort((a, b) => multiplier * (a[1] - b[1]))
                .map(e => e[0]);
        } else if (field === 'count') {
            vendors = Array.from(vendorCountsMap.entries())
                .sort((a, b) => multiplier * (a[1] - b[1]))
                .map(e => e[0]);
            agencies = Array.from(agencyCountsMap.entries())
                .sort((a, b) => multiplier * (a[1] - b[1]))
                .map(e => e[0]);
        } else {
            // Name sort
            vendors = Array.from(vendorTotalsMap.keys())
                .sort((a, b) => multiplier * a.localeCompare(b));
            agencies = Array.from(agencyTotalsMap.keys())
                .sort((a, b) => multiplier * a.localeCompare(b));
        }
        
        // Build matrix in sorted order
        const matrix = vendors.map(vendor => 
            agencies.map(agency => {
                const key = `${vendor}|||${agency}`;
                const cell = matrixMap.get(key);
                return cell ? { amount: cell.amount, count: cell.count } : { amount: 0, count: 0 };
            })
        );
        
        // Calculate totals
        const vendorTotals = vendors.map(vendor => vendorTotalsMap.get(vendor));
        const agencyTotals = agencies.map(agency => agencyTotalsMap.get(agency));
        
        return {
            vendors,
            agencies,
            matrix,
            vendorTotals,
            agencyTotals
        };
    },

    /**
     * Get unique values for filter dropdowns
     */
    getFilterOptions(data) {
        const vendors = [...new Set(data.map(r => r.vendor_name).filter(Boolean))].sort();
        const agencies = [...new Set(data.map(r => r.agency_name).filter(Boolean))].sort();
        
        return { vendors, agencies };
    }
};
