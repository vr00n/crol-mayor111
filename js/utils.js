/**
 * Utility functions for NYC Contract Awards Explorer
 */

const Utils = {
    /**
     * Format number as USD currency
     */
    formatCurrency(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '$0';
        }
        
        const num = Number(amount);
        
        if (num >= 1e9) {
            return '$' + (num / 1e9).toFixed(2) + 'B';
        } else if (num >= 1e6) {
            return '$' + (num / 1e6).toFixed(2) + 'M';
        } else if (num >= 1e3) {
            return '$' + (num / 1e3).toFixed(1) + 'K';
        }
        
        return '$' + num.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    },

    /**
     * Format number as full USD currency (no abbreviations)
     */
    formatCurrencyFull(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '$0';
        }
        
        return '$' + Number(amount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },

    /**
     * Format number with commas
     */
    formatNumber(num) {
        if (num === null || num === undefined || isNaN(num)) {
            return '0';
        }
        return Number(num).toLocaleString('en-US');
    },

    /**
     * Format date as YYYY-MM-DD
     */
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    },

    /**
     * Format date for display
     */
    formatDateDisplay(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    /**
     * Get today's date as YYYY-MM-DD
     */
    getToday() {
        return this.formatDate(new Date());
    },

    /**
     * Get date N days ago as YYYY-MM-DD
     */
    getDaysAgo(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return this.formatDate(date);
    },

    /**
     * Get start of current week (Monday)
     */
    getStartOfWeek() {
        const date = new Date();
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        date.setDate(diff);
        return this.formatDate(date);
    },

    /**
     * Get start of current month
     */
    getStartOfMonth() {
        const date = new Date();
        date.setDate(1);
        return this.formatDate(date);
    },

    /**
     * Concatenate other_info fields into a single string
     */
    concatenateOtherInfo(record) {
        const parts = [
            record.other_info_1,
            record.other_info_2,
            record.other_info_3
        ].filter(part => part && part.trim());
        
        return parts.join(' | ');
    },

    /**
     * Debounce function calls
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Truncate text with ellipsis
     */
    truncate(text, maxLength = 50) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    },

    /**
     * Generate a color based on string hash
     */
    stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const h = hash % 360;
        return `hsl(${h}, 65%, 55%)`;
    },

    /**
     * Create color scale for amounts
     */
    getAmountColorScale(minAmount, maxAmount) {
        return d3.scaleSequential()
            .domain([minAmount, maxAmount])
            .interpolator(d3.interpolateYlOrRd);
    },

    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Check if a string matches search query (case-insensitive)
     */
    matchesSearch(text, query) {
        if (!query) return true;
        if (!text) return false;
        return text.toLowerCase().includes(query.toLowerCase());
    },

    /**
     * Show tooltip at position
     */
    showTooltip(content, x, y) {
        const tooltip = document.getElementById('tooltip');
        tooltip.innerHTML = content;
        tooltip.classList.add('visible');
        
        // Position tooltip
        const rect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Adjust position if tooltip would go off screen
        let left = x + 15;
        let top = y + 15;
        
        if (left + rect.width > viewportWidth - 20) {
            left = x - rect.width - 15;
        }
        
        if (top + rect.height > viewportHeight - 20) {
            top = y - rect.height - 15;
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    },

    /**
     * Hide tooltip
     */
    hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        tooltip.classList.remove('visible');
    },

    /**
     * Show loading overlay
     */
    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
    },

    /**
     * Hide loading overlay
     */
    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    },

    /**
     * Update header stats
     */
    updateStats(contracts, totalAmount) {
        document.getElementById('total-contracts').textContent = this.formatNumber(contracts);
        document.getElementById('total-amount').textContent = this.formatCurrency(totalAmount);
    }
};
