# EasyCart — Simple Online Store

A very basic e-commerce demo built for a college assignment using only **HTML, CSS and vanilla JavaScript**.
Data (products, cart, orders) is saved in your browser's **localStorage**. There is no backend, no database and nothing to install.

> **Demo only.** No payments are processed and no real orders are shipped. Do not enter card details or real private information.

## Project structure

```
ecommerce-app/
  index.html   - page structure (navigation bar, footer, loads the CSS and JS)
  style.css    - styling (white background, purple accents, responsive layout)
  script.js    - all the logic (products, cart, checkout, orders, admin)
  README.md    - this file
```

## How to run it on Windows

1. Unzip the download (right-click the ZIP → **Extract All…**).
2. Open the `ecommerce-app` folder.
3. Double-click **index.html**. It opens in your default browser (Chrome, Edge or Firefox).

That's it. No installs, no commands.

## Features

- **Home / Products:** welcome banner, product cards, search by name, filter by category, friendly "no results" message.
- **Cart:** add, increase, decrease, remove, line totals, grand total, item count in the navigation bar. Saved across refreshes.
- **Checkout:** validated form (name, email, phone, address), order summary, creates an order with a unique ID, clears the cart, shows a confirmation.
- **Orders:** order ID, date, products, quantities, total and status (Placed → Processing → Shipped → Delivered).
- **Admin (demo mode):** add, edit and delete products (with a confirmation before delete), view orders and update their status.

## Demo admin mode (important)

The Admin page has a button called **Enter demo admin mode**. There is no password because this is a learning project.
`localStorage` and browser JavaScript can be changed by anyone, so it can **not** provide real security.
A production store needs a backend server with proper sign-in and **server-side authorization**.

## How the data is saved

| localStorage key      | What it holds                                  |
|-----------------------|------------------------------------------------|
| `easycart_products`   | The product catalog                            |
| `easycart_cart`       | Product IDs and quantities in the cart         |
| `easycart_orders`     | Placed orders and their statuses               |
| `easycart_seeded`     | Remembers the sample products were added once  |

Sample products are added **only on the first visit**; they are never overwritten afterwards.
Prices in the cart and orders are always calculated from real prices × quantities.
Broken or missing storage values are ignored safely.

To start fresh: open Admin → **Reset everything**, or clear the site data in your browser's settings.
Note: data is stored per browser, so a different browser (or computer) starts with its own empty store.

## Manual testing checklist

Try these in your browser to check each feature works:

1. Home page shows the product catalog.
2. Search and category filter work (try a search with no matches).
3. Click **Add to Cart** on a product.
4. In the cart, use **+** and **−** to change quantities.
5. Remove a product from the cart.
6. Check the totals: line total = price × quantity, and the grand total adds them up.
7. Submit the checkout form empty or with a bad email: it should be rejected.
8. Fill in the form correctly and place the order: an order is created.
9. The cart is now empty (the navigation badge shows 0).
10. Refresh the page and open **Orders**: the order is still there.
11. In Admin, add, edit and delete a product.
12. In Admin → Orders, change an order's status.
13. Open the Orders page: the new status is shown.
14. Make your browser window narrow (or use phone view with F12): the layout should still fit.

## Upload to GitHub (no Git installation needed)

1. Create a free account at <https://github.com>.
2. Click **+ → New repository**. Name it, for example, `easycart`. Choose **Public**. Click **Create repository**.
3. On the new repository page, click **uploading an existing file**.
4. Open your extracted `ecommerce-app` folder and drag **the four files** (`index.html`, `style.css`, `script.js`, `README.md`) into the browser window. (Drag the files, not the ZIP.)
5. Click **Commit changes**.

### Optional: using Git instead

If you have Git installed, run these in the `ecommerce-app` folder (replace `YOUR-USERNAME`):

```
git init
git add .
git commit -m "EasyCart first version"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/easycart.git
git push -u origin main
```

## Publish with GitHub Pages (optional)

1. In your repository, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose branch **main** and folder **/ (root)**, then click **Save**.
4. Wait a minute or two. Your site will be at `https://YOUR-USERNAME.github.io/easycart/`.

Because `index.html` is in the root of the repository, no other setup is needed.
Remember: each visitor's cart, orders and admin changes are stored only in their own browser.

## Customising

- Change the currency symbol: edit `CURRENCY` near the top of `script.js`.
- Change the sample products: edit `SAMPLE_PRODUCTS` in `script.js` (then use Admin → Reset everything).
- Change colors: edit the variables at the top of `style.css`.
- Product images: sample products use emoji placeholders. In Admin you can paste an image URL; if it fails to load, the placeholder is shown.
