/**
 * Sankey diagram module using D3.js
 */

const SankeyChart = {
    svg: null,
    width: 0,
    height: 0,
    margin: { top: 20, right: 200, bottom: 20, left: 200 },
    highlightedNode: null,

    /**
     * Initialize the Sankey chart
     */
    init() {
        const container = document.getElementById('sankey-chart');
        
        // Clear any existing content
        container.innerHTML = '';
        
        // Get dimensions
        const rect = container.getBoundingClientRect();
        this.width = rect.width - this.margin.left - this.margin.right;
        this.height = Math.max(rect.height, 600) - this.margin.top - this.margin.bottom;
        
        // Create SVG
        this.svg = d3.select(container)
            .append('svg')
            .attr('width', rect.width)
            .attr('height', Math.max(rect.height, 600))
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Add resize listener
        window.addEventListener('resize', Utils.debounce(() => {
            if (this.lastData) {
                this.render(this.lastData);
            }
        }, 250));
    },

    /**
     * Render the Sankey diagram
     */
    render(data) {
        if (!data || data.length === 0) {
            this.showEmpty();
            return;
        }
        
        this.lastData = data;
        
        // Re-initialize if container size changed or SVG was destroyed
        const container = document.getElementById('sankey-chart');
        const rect = container.getBoundingClientRect();
        const newWidth = rect.width - this.margin.left - this.margin.right;
        
        // Check if SVG exists, if not reinitialize
        if (!this.svg || !container.querySelector('svg') || Math.abs(newWidth - this.width) > 50) {
            this.init();
        }
        
        // Clear previous content
        this.svg.selectAll('*').remove();
        
        // Get current sort setting
        const sortBy = Filters.state.sortBy;
        
        // Aggregate data for Sankey with sorting
        const sankeyData = API.aggregateForSankey(data, sortBy);
        
        if (sankeyData.nodes.length === 0 || sankeyData.links.length === 0) {
            this.showEmpty();
            return;
        }
        
        // Limit to top connections for performance
        const maxLinks = 100;
        const topLinks = sankeyData.links
            .sort((a, b) => b.value - a.value)
            .slice(0, maxLinks);
        
        // Get nodes that are actually used in top links
        const usedNodeIndices = new Set();
        topLinks.forEach(link => {
            usedNodeIndices.add(link.source);
            usedNodeIndices.add(link.target);
        });
        
        // Rebuild nodes and links with new indices
        const nodeMap = new Map();
        const filteredNodes = [];
        
        sankeyData.nodes.forEach((node, oldIndex) => {
            if (usedNodeIndices.has(oldIndex)) {
                nodeMap.set(oldIndex, filteredNodes.length);
                filteredNodes.push({ ...node, index: filteredNodes.length });
            }
        });
        
        const filteredLinks = topLinks.map(link => ({
            ...link,
            source: nodeMap.get(link.source),
            target: nodeMap.get(link.target)
        })).filter(link => link.source !== undefined && link.target !== undefined);
        
        // Check if we have valid data
        if (filteredNodes.length === 0 || filteredLinks.length === 0) {
            this.showEmpty();
            return;
        }
        
        // Create Sankey layout
        const sankey = d3.sankey()
            .nodeWidth(15)
            .nodePadding(12)
            .nodeAlign(d3.sankeyJustify)
            .extent([[0, 0], [this.width, this.height]]);
        
        // Generate layout - use numeric indices
        const { nodes, links } = sankey({
            nodes: filteredNodes.map((d, i) => ({ ...d })),
            links: filteredLinks.map(d => ({ 
                source: d.source, 
                target: d.target, 
                value: d.value,
                count: d.count,
                vendor: d.vendor,
                agency: d.agency,
                contracts: d.contracts
            }))
        });
        
        // Color scales
        const vendorColor = d3.scaleOrdinal()
            .domain(nodes.filter(n => n.type === 'vendor').map(n => n.name))
            .range(d3.quantize(t => d3.interpolateTurbo(t * 0.7 + 0.1), 
                nodes.filter(n => n.type === 'vendor').length || 1));
        
        const agencyColor = d3.scaleOrdinal()
            .domain(nodes.filter(n => n.type === 'agency').map(n => n.name))
            .range(d3.quantize(t => d3.interpolateViridis(t * 0.7 + 0.1),
                nodes.filter(n => n.type === 'agency').length || 1));
        
        // Draw links
        const linkGroup = this.svg.append('g')
            .attr('class', 'sankey-links')
            .attr('fill', 'none');
        
        const link = linkGroup.selectAll('.sankey-link')
            .data(links)
            .join('path')
            .attr('class', 'sankey-link')
            .attr('d', d3.sankeyLinkHorizontal())
            .attr('stroke', d => vendorColor(d.vendor))
            .attr('stroke-width', d => Math.max(1, d.width))
            .attr('stroke-opacity', 0.4)
            .style('mix-blend-mode', 'screen');
        
        // Link hover events
        link.on('mouseover', (event, d) => {
            link.attr('stroke-opacity', l => 
                l === d ? 0.8 : 0.1
            );
            
            this.showLinkTooltip(event, d);
        })
        .on('mousemove', (event) => {
            Utils.showTooltip(
                document.getElementById('tooltip').innerHTML,
                event.clientX,
                event.clientY
            );
        })
        .on('mouseout', () => {
            link.attr('stroke-opacity', 0.4);
            Utils.hideTooltip();
        });
        
        // Draw nodes
        const nodeGroup = this.svg.append('g')
            .attr('class', 'sankey-nodes');
        
        const node = nodeGroup.selectAll('.sankey-node')
            .data(nodes)
            .join('g')
            .attr('class', 'sankey-node')
            .attr('transform', d => `translate(${d.x0},${d.y0})`);
        
        // Node rectangles
        node.append('rect')
            .attr('width', d => d.x1 - d.x0)
            .attr('height', d => Math.max(1, d.y1 - d.y0))
            .attr('fill', d => d.type === 'vendor' ? vendorColor(d.name) : agencyColor(d.name))
            .attr('opacity', 0.9)
            .attr('rx', 2);
        
        // Node labels
        node.append('text')
            .attr('x', d => d.type === 'vendor' ? -8 : (d.x1 - d.x0) + 8)
            .attr('y', d => (d.y1 - d.y0) / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', d => d.type === 'vendor' ? 'end' : 'start')
            .attr('fill', '#9aa0a8')
            .attr('font-size', '11px')
            .text(d => Utils.truncate(d.name, 30));
        
        // Node hover events
        node.on('mouseover', (event, d) => {
            // Highlight connected links
            link.attr('stroke-opacity', l => 
                (l.source === d || l.target === d) ? 0.8 : 0.1
            );
            
            this.showNodeTooltip(event, d, links);
        })
        .on('mousemove', (event) => {
            Utils.showTooltip(
                document.getElementById('tooltip').innerHTML,
                event.clientX,
                event.clientY
            );
        })
        .on('mouseout', () => {
            link.attr('stroke-opacity', 0.4);
            Utils.hideTooltip();
        })
        .on('click', (event, d) => {
            this.handleNodeClick(d);
        });
    },

    /**
     * Show tooltip for link
     */
    showLinkTooltip(event, d) {
        // Get sample contract info from the link
        const sampleContract = d.contracts && d.contracts.length > 0 ? d.contracts[0] : null;
        const additionalInfo = sampleContract ? sampleContract.additional_info : '';
        
        const content = `
            <div class="tooltip-title">${Utils.escapeHtml(d.vendor)}</div>
            <div class="tooltip-row">
                <span class="tooltip-label">Agency</span>
                <span class="tooltip-value">${Utils.escapeHtml(d.agency)}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">Total Amount</span>
                <span class="tooltip-value amount">${Utils.formatCurrencyFull(d.value)}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">Contracts</span>
                <span class="tooltip-value">${Utils.formatNumber(d.count)}</span>
            </div>
            ${additionalInfo ? `<div class="tooltip-info">${Utils.escapeHtml(Utils.truncate(additionalInfo, 200))}</div>` : ''}
        `;
        
        Utils.showTooltip(content, event.clientX, event.clientY);
    },

    /**
     * Show tooltip for node
     */
    showNodeTooltip(event, d, links) {
        const connectedLinks = links.filter(l => l.source === d || l.target === d);
        const totalAmount = connectedLinks.reduce((sum, l) => sum + l.value, 0);
        const totalContracts = connectedLinks.reduce((sum, l) => sum + l.count, 0);
        const connections = connectedLinks.length;
        
        const typeLabel = d.type === 'vendor' ? 'Vendor' : 'Agency';
        const connectionLabel = d.type === 'vendor' ? 'Agencies' : 'Vendors';
        
        const content = `
            <div class="tooltip-title">${Utils.escapeHtml(d.name)}</div>
            <div class="tooltip-row">
                <span class="tooltip-label">Type</span>
                <span class="tooltip-value">${typeLabel}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">Total Amount</span>
                <span class="tooltip-value amount">${Utils.formatCurrencyFull(totalAmount)}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">Total Contracts</span>
                <span class="tooltip-value">${Utils.formatNumber(totalContracts)}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">${connectionLabel}</span>
                <span class="tooltip-value">${Utils.formatNumber(connections)}</span>
            </div>
        `;
        
        Utils.showTooltip(content, event.clientX, event.clientY);
    },

    /**
     * Handle node click - filter to show only this node's connections
     */
    handleNodeClick(d) {
        if (d.type === 'vendor') {
            // Add to vendor filter
            if (!Filters.state.selectedVendors.includes(d.name)) {
                Filters.state.selectedVendors.push(d.name);
                Filters.updateTags('vendor');
                Filters.syncDropdown('vendor-filter', Filters.state.selectedVendors);
                App.applyClientFilters();
            }
        } else {
            // Add to agency filter
            if (!Filters.state.selectedAgencies.includes(d.name)) {
                Filters.state.selectedAgencies.push(d.name);
                Filters.updateTags('agency');
                Filters.syncDropdown('agency-filter', Filters.state.selectedAgencies);
                App.applyClientFilters();
            }
        }
    },

    /**
     * Show empty state
     */
    showEmpty() {
        const container = document.getElementById('sankey-chart');
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M3 3v18h18"/>
                    <path d="M7 16l4-8 4 4 4-8" stroke-dasharray="2 2"/>
                </svg>
                <h3>No Data Available</h3>
                <p>Try adjusting your filters or date range to see contract data.</p>
            </div>
        `;
    }
};
