# Kiryana Inventory System CLI Guide

This command-line interface (CLI) allows you to manage your inventory from the terminal, complementing the web interface.

## Available Commands

### Product Management

```bash
# List all products
python cli.py list-products
# Show only low stock products
python cli.py list-products --low-stock

# Add a new product
python cli.py add-product --name "Product Name" --sku "SKU123" --price 25.99 --reorder 15 --description "Optional description"

# View product details by ID
python cli.py show-product --id 1
# Or by SKU
python cli.py show-product --sku "SKU123"
```

### Inventory Movements

```bash
# Record stock in (add inventory)
python cli.py stock-in --product-id 1 --quantity 100 --reference "INV-001" --notes "Initial stock"

# Record a sale
python cli.py sale --product-id 1 --quantity 5 --reference "SALE-001" --notes "Customer sale"

# Record removal (damage, loss, etc.)
python cli.py removal --product-id 1 --quantity 2 --reason damaged --notes "Broken during delivery"
```

### Inventory Reports

```bash
# View current inventory status
python cli.py inventory

# View movement history (last 30 days by default)
python cli.py movements

# Filter movements by product
python cli.py movements --product-id 1

# Filter by movement type
python cli.py movements --type stock_in
python cli.py movements --type sale
python cli.py movements --type removal

# Change time period
python cli.py movements --days 7  # Show only last 7 days
```

## Integration with Web Interface

The CLI uses the same database as the web interface, so any changes you make through the CLI will be immediately visible in the web interface and vice versa.

## Getting Help

Every command has a built-in help feature:

```bash
# General help
python cli.py --help

# Help for specific command
python cli.py stock-in --help
```

## Use Cases

- **Bulk Operations**: Quickly add multiple products or record multiple transactions
- **Reporting**: Generate reports for business analysis
- **Automation**: Script inventory operations for automated processes
- **Remote Management**: Manage inventory through SSH when a web browser is not available
