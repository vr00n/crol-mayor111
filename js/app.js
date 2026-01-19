/**
 * Main application module
 * Wires up all modules and handles state management
 */

const App = {
    // Raw data from API
    rawData: [],
    // Filtered data for display
    filteredData: [],
    // Current active tab
    activeTab: 'sankey',
    // Last data fetch timestamp
    lastFetchTime: null,

    /**
     * Initialize the application
     */
    async init() {
        console.log('NYC Contract Awards Explorer initializing...');
        
        // Initialize modules
        Filters.init();
        SankeyChart.init();
        MatrixChart.init();
        
        // Bind tab switching
        this.bindTabs();
        
        // Bind refresh button
        this.bindRefresh();
        
        // Initial data fetch
        await this.fetchAndRender();
        
        console.log('Application initialized successfully');
    },

    /**
     * Bind refresh button
     */
    bindRefresh() {
        const refreshBtn = document.getElementById('refresh-data');
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.classList.add('spinning');
            await this.fetchAndRender();
            refreshBtn.classList.remove('spinning');
        });
    },

    /**
     * Bind tab switching events
     */
    bindTabs() {
        const tabs = document.querySelectorAll('.tab');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });
    },

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        this.activeTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Update tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabName}-view`);
        });
        
        // Re-render the active view
        this.renderActiveView();
    },

    /**
     * Fetch data from API and render
     */
    async fetchAndRender() {
        try {
            Utils.showLoading();
            
            // Get API params from filters
            const params = Filters.getApiParams();
            
            // Fetch data
            this.rawData = await API.fetchAll(params);
            
            // Update last fetch time
            this.lastFetchTime = new Date();
            this.updateLastFetchDisplay();
            
            console.log(`Fetched ${this.rawData.length} records`);
            
            // Update filter dropdowns with available options
            const options = API.getFilterOptions(this.rawData);
            Filters.populateDropdowns(options);
            
            // Re-initialize charts (in case they were destroyed by empty state)
            SankeyChart.init();
            
            // Apply client-side filters and render
            this.applyClientFilters();
            
        } catch (error) {
            console.error('Error fetching data:', error);
            this.showError('Failed to load data. Please try again.');
        } finally {
            Utils.hideLoading();
        }
    },

    /**
     * Update the last fetch time display
     */
    updateLastFetchDisplay() {
        const el = document.getElementById('last-updated');
        if (this.lastFetchTime) {
            el.textContent = this.lastFetchTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
            el.title = this.lastFetchTime.toLocaleString();
        }
    },

    /**
     * Apply client-side filters and re-render
     */
    applyClientFilters() {
        // Apply filters to raw data
        this.filteredData = Filters.applyFilters(this.rawData);
        
        // Update stats
        const totalAmount = this.filteredData.reduce((sum, r) => sum + (r.contract_amount || 0), 0);
        Utils.updateStats(this.filteredData.length, totalAmount);
        
        // Render active view
        this.renderActiveView();
    },

    /**
     * Render the currently active view
     */
    renderActiveView() {
        if (this.activeTab === 'sankey') {
            SankeyChart.render(this.filteredData);
        } else if (this.activeTab === 'matrix') {
            MatrixChart.render(this.filteredData);
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        const container = document.querySelector('.tab-pane.active .chart, .tab-pane.active .matrix');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 8v4M12 16h.01"/>
                    </svg>
                    <h3>Error</h3>
                    <p>${Utils.escapeHtml(message)}</p>
                </div>
            `;
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
