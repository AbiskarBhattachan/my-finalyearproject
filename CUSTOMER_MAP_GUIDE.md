# 🗺️ Customer Live Tracking Guide

## Where Can Customers See Rider Location?

Customers can track their delivery rider in **real-time** on the **Orders Page**.

---

## 📍 How to Access Live Tracking

### Step 1: Go to Orders Page
- Navigate to: **`/orders`**
- Or click "My Orders" from the home page

### Step 2: Select Your Order
- Click on any active order from the list
- The order detail will show on the right side

### Step 3: View the Live Map
The map will **automatically appear** when:
- ✅ A delivery rider has been assigned to your order
- ✅ Order status is NOT "delivered" yet

---

## 🎯 What Customers Can See

### 📦 Order Progress Tracker
Shows the current status:
- 🛒 Order Placed
- ✅ Confirmed
- 👨‍🍳 Preparing
- 🛵 Out for Delivery
- 🎉 Delivered

### 🗺️ Live Delivery Map
When a rider is assigned, customers see:

1. **🍽️ Restaurant Marker** (Orange)
   - Shows where the food is being prepared
   - Pickup location

2. **🛵 Rider Marker** (Blue)
   - Shows rider's current location
   - **Updates in real-time** as rider moves
   - Smooth animated transitions

3. **🏠 Customer Marker** (Green)
   - Shows delivery destination
   - Your address

4. **Route Line** (Blue dashed line)
   - Shows the driving route from restaurant to customer
   - Calculated using real road data

### ⏱️ ETA Display
- Shows estimated delivery time
- Updates based on rider's progress
- Format: "Arriving at 7:30 PM"

### 📊 Location Status Indicators
Small cards showing:
- 🍽️ Restaurant - Located
- 🛵 Rider - Tracking (live)
- 🏠 Customer - Located

---

## 🔄 Real-Time Updates

The map updates **automatically** when:
- ✅ Rider updates their location
- ✅ Order status changes
- ✅ ETA is updated

**No page refresh needed!** Everything updates live via Supabase Realtime.

---

## 📱 Map Features for Customers

### Interactive Controls
- **Zoom In/Out** - Use +/- buttons or scroll wheel
- **Pan** - Click and drag to move around
- **Marker Popups** - Click markers to see details
- **Auto-fit** - Map automatically adjusts to show all locations

### Mobile Friendly
- Touch gestures work perfectly
- Responsive design
- Works on all screen sizes

---

## 🎬 Customer Journey Example

### Scenario: Pizza Delivery

1. **Order Placed** (Status: Pending)
   - No map shown yet
   - Waiting for restaurant confirmation

2. **Order Confirmed** (Status: Confirmed)
   - No map shown yet
   - Waiting for rider assignment

3. **Rider Assigned** (Status: Preparing)
   - 🎉 **Map appears!**
   - Shows restaurant and customer locations
   - Rider marker appears when they start tracking

4. **Out for Delivery** (Status: Out for Delivery)
   - 🛵 Rider marker moves in real-time
   - Route line shows path
   - ETA updates dynamically
   - Customer can watch rider approaching

5. **Delivered** (Status: Delivered)
   - Map disappears
   - Shows "Order Delivered! 🎉" message
   - Customer can leave a review

---

## 🔍 When Map Shows vs. Doesn't Show

### ✅ Map WILL Show When:
- Rider is assigned to the order
- Order status is: `confirmed`, `preparing`, or `out_for_delivery`
- Location data is available

### ❌ Map WON'T Show When:
- Order status is `pending` (no rider assigned yet)
- Order status is `delivered` (delivery complete)
- No location data available

---

## 🎨 Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  📋 My Orders                                    [← Home]   │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐  ┌────────────────────────────────────────┐
│              │  │  🛵 Out for Delivery                   │
│  Order List  │  │  Your order is on the way!             │
│              │  │  ETA: 7:30 PM                          │
│  [Order 1]   │  ├────────────────────────────────────────┤
│  [Order 2]   │  │                                        │
│  [Order 3]   │  │  📦 Order Progress                     │
│              │  │  ✓ Order Placed                        │
│              │  │  ✓ Confirmed                           │
│              │  │  ✓ Preparing                           │
│              │  │  ● Out for Delivery ← Current          │
│              │  │    Delivered                           │
│              │  │                                        │
│              │  ├────────────────────────────────────────┤
│              │  │                                        │
│              │  │  🗺️ Live Delivery Tracking            │
│              │  │  ┌──────────────────────────────────┐ │
│              │  │  │                                  │ │
│              │  │  │    🍽️ Restaurant                │ │
│              │  │  │         ╲                       │ │
│              │  │  │          ╲ (route)              │ │
│              │  │  │           ╲                     │ │
│              │  │  │            🛵 Rider (moving)    │ │
│              │  │  │             ╲                   │ │
│              │  │  │              ╲                  │ │
│              │  │  │               🏠 You            │ │
│              │  │  │                                  │ │
│              │  │  └──────────────────────────────────┘ │
│              │  │  🍽️ Restaurant  🛵 Rider  🏠 Customer│
│              │  │                                        │
│              │  ├────────────────────────────────────────┤
│              │  │  📦 Order Details                      │
│              │  │  Items, Total, Payment, etc.           │
└──────────────┘  └────────────────────────────────────────┘
```

---

## 🔐 Privacy & Security

### What Customers Can See:
- ✅ Rider's current location (only for their order)
- ✅ Rider's name and phone (if provided)
- ✅ Estimated delivery time

### What Customers CANNOT See:
- ❌ Rider's location history
- ❌ Other customers' orders
- ❌ Rider's personal information

### Security Features:
- Row Level Security (RLS) ensures customers only see their own orders
- Location data is only shared for active deliveries
- Real-time updates are secure via Supabase

---

## 💡 Tips for Customers

1. **Keep the page open** - Map updates automatically, no refresh needed
2. **Check ETA** - Estimated time updates as rider moves
3. **Contact rider** - Phone number shown if you need to call
4. **Be ready** - Watch the map to know when rider is close
5. **Leave a review** - After delivery, rate your experience

---

## 🐛 Troubleshooting

### Map Not Showing?

**Check:**
- ✅ Is a rider assigned to your order?
- ✅ Is order status not "delivered" yet?
- ✅ Refresh the page once
- ✅ Check browser console for errors (F12)

### Rider Location Not Updating?

**Possible reasons:**
- Rider hasn't started tracking yet
- Rider's GPS is off
- Network connection issue
- Wait a few seconds and it should update

### Map Shows But No Rider Marker?

**This means:**
- Rider is assigned but hasn't started location tracking yet
- Rider will appear once they enable location updates
- You'll still see restaurant and customer markers

---

## 📞 Support

If customers have issues:
1. Check this guide first
2. Refresh the page
3. Check order status
4. Contact support if problem persists

---

## 🎉 Summary

**Customers can track their delivery rider in real-time on the `/orders` page!**

The map shows:
- 🍽️ Restaurant location
- 🛵 Rider location (live updates)
- 🏠 Customer location
- 📍 Route between locations
- ⏱️ Estimated delivery time

Everything updates automatically - no refresh needed!

---

**Built with ❤️ for the best customer experience**
