/**
 * Matrix view module - Vendor x Agency cross-tabulation
 */

const MatrixChart = {
    lastData: null,
    sortColumn: null,
    sortDirection: 'desc',

    /**
     * Initialize the matrix view
     */
    init() {
        // Nothing special needed for initialization
    },

    /**
     * Render the matrix
     */
    render(data) {
        const container = document.getElementById('matrix-chart');
        
        if (!data || data.length === 0) {
            this.showEmpty();
            return;
        }
        
        this.lastData = data;
        
        // Get current sort setting
        const sortBy = Filters.state.sortBy;
        
        // Aggregate data for matrix with sorting
        const matrixData = API.aggregateForMatrix(data, sortBy);
        
        if (matrixData.vendors.length === 0 || matrixData.agencies.length === 0) {
            this.showEmpty();
            return;
        }
        
        // Limit dimensions for performance
        const maxVendors = 50;
        const maxAgencies = 30;
        
        // Vendors and agencies are already sorted by API, just limit them
        const vendorOrder = matrixData.vendors
            .slice(0, maxVendors)
            .map((v, i) => ({ name: v, total: matrixData.vendorTotals[i], index: i }));
        
        const agencyOrder = matrixData.agencies
            .slice(0, maxAgencies)
            .map((a, i) => ({ name: a, total: matrixData.agencyTotals[i], index: i }));
        
        // Find max amount for color scale
        let maxAmount = 0;
        vendorOrder.forEach(v => {
            agencyOrder.forEach(a => {
                const cell = matrixData.matrix[v.index][a.index];
                if (cell.amount > maxAmount) {
                    maxAmount = cell.amount;
                }
            });
        });
        
        // Color scale
        const colorScale = d3.scaleSequential()
            .domain([0, maxAmount])
            .interpolator(d3.interpolateYlOrRd);
        
        // Build table HTML
        let html = '<table class="matrix-table">';
        
        // Header row
        html += '<thead><tr>';
        html += '<th class="corner row-header">Vendor / Agency</th>';
        agencyOrder.forEach(a => {
            html += `<th class="matrix-cell" title="${Utils.escapeHtml(a.name)}">
                ${Utils.escapeHtml(Utils.truncate(a.name, 20))}
                <div style="font-size:0.7rem;color:#6b7280;font-weight:400;">
                    ${Utils.formatCurrency(a.total)}
                </div>
            </th>`;
        });
        html += '<th class="matrix-cell">Total</th>';
        html += '</tr></thead>';
        
        // Data rows
        html += '<tbody>';
        vendorOrder.forEach(v => {
            html += '<tr>';
            html += `<th class="row-header" title="${Utils.escapeHtml(v.name)}">
                ${Utils.escapeHtml(Utils.truncate(v.name, 30))}
            </th>`;
            
            agencyOrder.forEach(a => {
                const cell = matrixData.matrix[v.index][a.index];
                const bgColor = cell.amount > 0 ? colorScale(cell.amount) : 'transparent';
                const textColor = cell.amount > maxAmount * 0.5 ? '#fff' : '#e8eaed';
                
                html += `<td class="matrix-cell" 
                    style="background-color:${bgColor};color:${textColor}"
                    data-vendor="${Utils.escapeHtml(v.name)}"
                    data-agency="${Utils.escapeHtml(a.name)}"
                    data-amount="${cell.amount}"
                    data-count="${cell.count}">
                    ${cell.amount > 0 ? Utils.formatCurrency(cell.amount) : '-'}
                </td>`;
            });
            
            // Row total
            html += `<td class="matrix-cell" style="background:#232a35;font-weight:600;">
                ${Utils.formatCurrency(v.total)}
            </td>`;
            
            html += '</tr>';
        });
        
        // Footer row with column totals
        html += '<tr>';
        html += '<th class="row-header" style="font-weight:600;">Total</th>';
        agencyOrder.forEach(a => {
            html += `<td class="matrix-cell" style="background:#232a35;font-weight:600;">
                ${Utils.formatCurrency(a.total)}
            </td>`;
        });
        
        // Grand total
        const grandTotal = vendorOrder.reduce((sum, v) => sum + v.total, 0);
        html += `<td class="matrix-cell" style="background:#ff6b4a;color:#0d0f12;font-weight:700;">
            ${Utils.formatCurrency(grandTotal)}
        </td>`;
        html += '</tr>';
        
        html += '</tbody></table>';
        
        container.innerHTML = html;
        
        // Add hover events
        this.bindCellEvents();
    },

    /**
     * Bind cell hover and click events
     */
    bindCellEvents() {
        const cells = document.querySelectorAll('.matrix-cell[data-vendor]');
        
        cells.forEach(cell => {
            cell.addEventListener('mouseover', (event) => {
                const vendor = cell.dataset.vendor;
                const agency = cell.dataset.agency;
                const amount = parseFloat(cell.dataset.amount);
                const count = parseInt(cell.dataset.count);
                
                if (amount > 0) {
                    const content = `
                        <div class="tooltip-title">${Utils.escapeHtml(vendor)}</div>
                        <div class="tooltip-row">
                            <span class="tooltip-label">Agency</span>
                            <span class="tooltip-value">${Utils.escapeHtml(agency)}</span>
                        </div>
                        <div class="tooltip-row">
                            <span class="tooltip-label">Total Amount</span>
                            <span class="tooltip-value amount">${Utils.formatCurrencyFull(amount)}</span>
                        </div>
                        <div class="tooltip-row">
                            <span class="tooltip-label">Contracts</span>
                            <span class="tooltip-value">${Utils.formatNumber(count)}</span>
                        </div>
                    `;
                    
                    Utils.showTooltip(content, event.clientX, event.clientY);
                }
            });
            
            cell.addEventListener('mousemove', (event) => {
                if (parseFloat(cell.dataset.amount) > 0) {
                    Utils.showTooltip(
                        document.getElementById('tooltip').innerHTML,
                        event.clientX,
                        event.clientY
                    );
                }
            });
            
            cell.addEventListener('mouseout', () => {
                Utils.hideTooltip();
            });
            
            cell.addEventListener('click', () => {
                const vendor = cell.dataset.vendor;
                const agency = cell.dataset.agency;
                const amount = parseFloat(cell.dataset.amount);
                
                if (amount > 0) {
                    // Add both filters
                    if (!Filters.state.selectedVendors.includes(vendor)) {
                        Filters.state.selectedVendors.push(vendor);
                        Filters.updateTags('vendor');
                        Filters.syncDropdown('vendor-filter', Filters.state.selectedVendors);
                    }
                    
                    if (!Filters.state.selectedAgencies.includes(agency)) {
                        Filters.state.selectedAgencies.push(agency);
                        Filters.updateTags('agency');
                        Filters.syncDropdown('agency-filter', Filters.state.selectedAgencies);
                    }
                    
                    App.applyClientFilters();
                }
            });
        });
    },

    /**
     * Show empty state
     */
    showEmpty() {
        const container = document.getElementById('matrix-chart');
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke-dasharray="2 2"/>
                </svg>
                <h3>No Data Available</h3>
                <p>Try adjusting your filters or date range to see contract data.</p>
            </div>
        `;
    }
};
