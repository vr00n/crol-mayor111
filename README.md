# NYC Contract Awards Explorer

An interactive web application for investigative journalists to explore NYC contract awards data from the City Record Online (CROL) database.

## Features

### Sankey Diagram View
- Visualizes the flow of contracts from **Vendors** (left) to **Agencies** (right)
- Link width proportional to total contract amount
- Interactive tooltips showing vendor, agency, total amount, and contract count
- Click on nodes to filter data

### Matrix View
- Cross-tabulation grid of Vendors × Agencies
- Heat map coloring based on contract amounts
- Sortable by amount
- Click cells to filter by vendor-agency pair

### Filter Controls
- **Date Presets**: Quick buttons for Today, This Week, This Month, Last 30 Days
- **Custom Date Range**: Flexible start/end date pickers
- **Global Search**: Search across vendor names, agency names, contract titles, and additional info
- **Minimum Amount**: Filter by contract value
- **Vendor/Agency Dropdowns**: Multi-select filtering
- **Sort Options**: Sort by amount, count, or name

## Data Source

Data is pulled live from the [NYC Open Data - City Record Online](https://data.cityofnewyork.us/City-Government/City-Record-Online/dg92-zbpx) dataset via the Socrata Open Data API (SODA).

Default filter: `contract_amount > 0` (only awarded contracts with monetary value)

## Deployment

This is a static web application that can be deployed to GitHub Pages or any static hosting service.

### GitHub Pages

1. Push this repository to GitHub
2. Go to Settings → Pages
3. Select "Deploy from a branch" and choose `main` branch
4. Your app will be available at `https://<username>.github.io/<repo-name>/`

### Local Development

```bash
# Start a local server
python3 -m http.server 8080

# Open in browser
open http://localhost:8080
```

## Tech Stack

- **Vanilla JavaScript** - No build step required
- **D3.js v7** - Data visualization
- **d3-sankey** - Sankey diagram layout
- **SODA API** - NYC Open Data access

## File Structure

```
├── index.html          # Main HTML
├── css/
│   └── styles.css      # Dark theme styling
├── js/
│   ├── app.js          # Main application logic
│   ├── api.js          # SODA API data fetching
│   ├── filters.js      # Filter controls
│   ├── sankey.js       # Sankey diagram
│   ├── matrix.js       # Matrix view
│   └── utils.js        # Helper functions
└── README.md
```

## API Fields Used

| Field | Description |
|-------|-------------|
| `vendor_name` | Name of the awarded vendor |
| `agency_name` | NYC agency awarding the contract |
| `contract_amount` | Dollar value of the contract |
| `short_title` | Brief description |
| `start_date` | Notice publication date |
| `other_info_1/2/3` | Additional contract details |

## License

This project uses public domain data from NYC Open Data.
