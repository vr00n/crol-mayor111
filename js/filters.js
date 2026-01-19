/**
 * Filters module for managing filter controls and state
 */

const Filters = {
    state: {
        startDate: '2026-01-01',
        endDate: null,
        searchQuery: '',
        minAmount: 0,
        selectedVendors: [],
        selectedAgencies: [],
        sortBy: 'amount-desc',
        activePreset: null
    },

    /**
     * Initialize filter controls
     */
    init() {
        this.bindDatePresets();
        this.bindDateInputs();
        this.bindSearch();
        this.bindAmountFilter();
        this.bindDropdowns();
        this.bindSortBy();
        this.bindButtons();
        
        // Set initial end date to today
        this.state.endDate = Utils.getToday();
        document.getElementById('end-date').value = this.state.endDate;
    },

    /**
     * Bind date preset buttons
     */
    bindDatePresets() {
        const presetBtns = document.querySelectorAll('.preset-btn');
        
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                this.applyPreset(preset);
                
                // Update active state
                presetBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.state.activePreset = preset;
            });
        });
    },

    /**
     * Apply date preset
     */
    applyPreset(preset) {
        const endDate = Utils.getToday();
        let startDate;
        
        switch (preset) {
            case 'today':
                startDate = endDate;
                break;
            case 'week':
                startDate = Utils.getStartOfWeek();
                break;
            case 'month':
                startDate = Utils.getStartOfMonth();
                break;
            case '30days':
                startDate = Utils.getDaysAgo(30);
                break;
            default:
                startDate = '2026-01-01';
        }
        
        this.state.startDate = startDate;
        this.state.endDate = endDate;
        
        // Update date inputs
        document.getElementById('start-date').value = startDate;
        document.getElementById('end-date').value = endDate;
    },

    /**
     * Bind date input changes
     */
    bindDateInputs() {
        const startInput = document.getElementById('start-date');
        const endInput = document.getElementById('end-date');
        
        startInput.addEventListener('change', () => {
            this.state.startDate = startInput.value;
            this.clearPresetActive();
        });
        
        endInput.addEventListener('change', () => {
            this.state.endDate = endInput.value;
            this.clearPresetActive();
        });
    },

    /**
     * Clear active preset button
     */
    clearPresetActive() {
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.state.activePreset = null;
    },

    /**
     * Bind search input
     */
    bindSearch() {
        const searchInput = document.getElementById('global-search');
        
        const debouncedSearch = Utils.debounce((value) => {
            this.state.searchQuery = value;
            // Trigger filter update without re-fetching data
            if (typeof App !== 'undefined' && App.applyClientFilters) {
                App.applyClientFilters();
            }
        }, 300);
        
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    },

    /**
     * Bind amount filter
     */
    bindAmountFilter() {
        const amountInput = document.getElementById('min-amount');
        
        amountInput.addEventListener('change', () => {
            this.state.minAmount = parseFloat(amountInput.value) || 0;
        });
    },

    /**
     * Bind dropdown filters
     */
    bindDropdowns() {
        const vendorSelect = document.getElementById('vendor-filter');
        const agencySelect = document.getElementById('agency-filter');
        
        vendorSelect.addEventListener('change', () => {
            this.state.selectedVendors = Array.from(vendorSelect.selectedOptions)
                .map(opt => opt.value)
                .filter(v => v !== '');
            this.updateTags('vendor');
        });
        
        agencySelect.addEventListener('change', () => {
            this.state.selectedAgencies = Array.from(agencySelect.selectedOptions)
                .map(opt => opt.value)
                .filter(v => v !== '');
            this.updateTags('agency');
        });
    },

    /**
     * Update selected tags display
     */
    updateTags(type) {
        const container = document.getElementById(`${type}-tags`);
        const selected = type === 'vendor' ? this.state.selectedVendors : this.state.selectedAgencies;
        
        container.innerHTML = selected.map(value => `
            <span class="tag">
                ${Utils.truncate(value, 25)}
                <span class="tag-remove" data-type="${type}" data-value="${Utils.escapeHtml(value)}">&times;</span>
            </span>
        `).join('');
        
        // Bind remove handlers
        container.querySelectorAll('.tag-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                const value = e.target.dataset.value;
                this.removeTag(type, value);
            });
        });
    },

    /**
     * Remove a tag
     */
    removeTag(type, value) {
        if (type === 'vendor') {
            this.state.selectedVendors = this.state.selectedVendors.filter(v => v !== value);
            this.syncDropdown('vendor-filter', this.state.selectedVendors);
        } else {
            this.state.selectedAgencies = this.state.selectedAgencies.filter(v => v !== value);
            this.syncDropdown('agency-filter', this.state.selectedAgencies);
        }
        this.updateTags(type);
    },

    /**
     * Sync dropdown selection with state
     */
    syncDropdown(id, selectedValues) {
        const select = document.getElementById(id);
        Array.from(select.options).forEach(opt => {
            opt.selected = selectedValues.includes(opt.value);
        });
    },

    /**
     * Bind sort by dropdown
     */
    bindSortBy() {
        const sortSelect = document.getElementById('sort-by');
        
        sortSelect.addEventListener('change', () => {
            this.state.sortBy = sortSelect.value;
            // Trigger re-render
            if (typeof App !== 'undefined' && App.applyClientFilters) {
                App.applyClientFilters();
            }
        });
    },

    /**
     * Bind apply/reset buttons
     */
    bindButtons() {
        document.getElementById('apply-filters').addEventListener('click', () => {
            if (typeof App !== 'undefined' && App.fetchAndRender) {
                App.fetchAndRender();
            }
        });
        
        document.getElementById('reset-filters').addEventListener('click', () => {
            this.reset();
        });
    },

    /**
     * Reset all filters to defaults
     */
    reset() {
        // Reset state
        this.state = {
            startDate: '2026-01-01',
            endDate: Utils.getToday(),
            searchQuery: '',
            minAmount: 0,
            selectedVendors: [],
            selectedAgencies: [],
            sortBy: 'amount-desc',
            activePreset: null
        };
        
        // Reset UI
        document.getElementById('start-date').value = this.state.startDate;
        document.getElementById('end-date').value = this.state.endDate;
        document.getElementById('global-search').value = '';
        document.getElementById('min-amount').value = '0';
        document.getElementById('sort-by').value = 'amount-desc';
        
        // Clear selections
        ['vendor-filter', 'agency-filter'].forEach(id => {
            const select = document.getElementById(id);
            Array.from(select.options).forEach(opt => opt.selected = false);
        });
        
        // Clear tags
        document.getElementById('vendor-tags').innerHTML = '';
        document.getElementById('agency-tags').innerHTML = '';
        
        // Clear preset active
        this.clearPresetActive();
        
        // Trigger fetch
        if (typeof App !== 'undefined' && App.fetchAndRender) {
            App.fetchAndRender();
        }
    },

    /**
     * Populate dropdown options
     */
    populateDropdowns(options) {
        const vendorSelect = document.getElementById('vendor-filter');
        const agencySelect = document.getElementById('agency-filter');
        
        // Keep first option (All)
        vendorSelect.innerHTML = '<option value="">All Vendors</option>';
        agencySelect.innerHTML = '<option value="">All Agencies</option>';
        
        options.vendors.forEach(vendor => {
            const opt = document.createElement('option');
            opt.value = vendor;
            opt.textContent = Utils.truncate(vendor, 40);
            vendorSelect.appendChild(opt);
        });
        
        options.agencies.forEach(agency => {
            const opt = document.createElement('option');
            opt.value = agency;
            opt.textContent = Utils.truncate(agency, 40);
            agencySelect.appendChild(opt);
        });
    },

    /**
     * Get current filter state for API call
     */
    getApiParams() {
        return {
            startDate: this.state.startDate,
            endDate: this.state.endDate,
            minAmount: this.state.minAmount
        };
    },

    /**
     * Apply client-side filters to data
     */
    applyFilters(data) {
        let filtered = [...data];
        
        // Search filter
        if (this.state.searchQuery) {
            const query = this.state.searchQuery.toLowerCase();
            filtered = filtered.filter(record => {
                const searchFields = [
                    record.vendor_name,
                    record.agency_name,
                    record.short_title,
                    record.additional_info
                ];
                return searchFields.some(field => 
                    field && field.toLowerCase().includes(query)
                );
            });
        }
        
        // Vendor filter
        if (this.state.selectedVendors.length > 0) {
            filtered = filtered.filter(record => 
                this.state.selectedVendors.includes(record.vendor_name)
            );
        }
        
        // Agency filter
        if (this.state.selectedAgencies.length > 0) {
            filtered = filtered.filter(record => 
                this.state.selectedAgencies.includes(record.agency_name)
            );
        }
        
        // Sort
        filtered = this.sortData(filtered);
        
        return filtered;
    },

    /**
     * Sort data based on current sort setting
     */
    sortData(data) {
        const [field, direction] = this.state.sortBy.split('-');
        const multiplier = direction === 'desc' ? -1 : 1;
        
        return [...data].sort((a, b) => {
            let valueA, valueB;
            
            switch (field) {
                case 'amount':
                    valueA = a.contract_amount || 0;
                    valueB = b.contract_amount || 0;
                    break;
                case 'count':
                    // This is handled at aggregate level
                    valueA = a.contract_amount || 0;
                    valueB = b.contract_amount || 0;
                    break;
                case 'name':
                    valueA = (a.vendor_name || '').toLowerCase();
                    valueB = (b.vendor_name || '').toLowerCase();
                    return multiplier * valueA.localeCompare(valueB);
                default:
                    return 0;
            }
            
            return multiplier * (valueA - valueB);
        });
    }
};
