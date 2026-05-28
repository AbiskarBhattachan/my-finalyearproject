# UI Guide: Restaurant Location Feature

## 📱 User Interface Overview

This guide shows what users will see when using the restaurant location feature.

---

## 1️⃣ Seller Profile Page

### Location: `/profile`
### Who Sees It: Sellers only

```
┌────────────────────────────────────────────────────────────┐
│  Thakali Express                          ← Back to Home   │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  👤  My Profile                                             │
│      Manage your account details                           │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Update Full Name                                           │
│  ─────────────────────────────────────────────────────────│
│  Full Name                                                  │
│  [John Doe                                              ]  │
│                                                             │
│  [Save Name]                                                │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Change Password                                            │
│  ─────────────────────────────────────────────────────────│
│  New Password                                               │
│  [••••••••                                              ]  │
│                                                             │
│  Confirm New Password                                       │
│  [••••••••                                              ]  │
│                                                             │
│  [Change Password]                                          │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  🏪 Restaurant Location                                     │
│  ─────────────────────────────────────────────────────────│
│  Set your restaurant location so delivery riders can       │
│  find the pickup point easily.                             │
│                                                             │
│  Restaurant Address                                         │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Thamel Marg, Kathmandu                               │ │
│  │ Near Kathmandu Guest House                           │ │
│  │                                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  Latitude                    Longitude                      │
│  [27.7172              ]    [85.3240               ]       │
│                                                             │
│  [📍 Get Current Location]                                  │
│                                                             │
│  [Save Restaurant Location]                                 │
└────────────────────────────────────────────────────────────┘
```

### Features:
- **Restaurant Address**: Multi-line text area for full address
- **Latitude/Longitude**: Number inputs with decimal support
- **Get Current Location**: Auto-captures GPS coordinates
- **Save Button**: Validates and saves location

---

## 2️⃣ Checkout Page (Customer View)

### Location: `/checkout`
### Who Sees It: Customers

```
┌────────────────────────────────────────────────────────────┐
│  💳 Checkout                            ← Back to Cart     │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Order Summary                                              │
│  ─────────────────────────────────────────────────────────│
│  🍽️ Chicken Momo                              Rs. 150.00   │
│     Appetizer · ×2                                          │
│                                                             │
│  🍽️ Thakali Set                               Rs. 350.00   │
│     Main Course · ×1                                        │
│  ─────────────────────────────────────────────────────────│
│  Total                                        Rs. 500.00   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📍 Delivery Information                              │ │
│  │                                                      │ │
│  │ Delivery Address *                                   │ │
│  │ [Boudhanath, Near Stupa                          ]  │ │
│  │                                                      │ │
│  │ City *              Postal Code                      │ │
│  │ [Kathmandu      ]  [44600                        ]  │ │
│  │                                                      │ │
│  │ Phone Number *                                       │ │
│  │ [9841234567                                      ]  │ │
│  │                                                      │ │
│  │ Delivery Notes                                       │ │
│  │ ┌────────────────────────────────────────────────┐ │ │
│  │ │ Please call when you arrive                    │ │ │
│  │ └────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 💳 Payment Method                                    │ │
│  │                                                      │ │
│  │ ⦿ 💵 Cash on Delivery              [Selected]       │ │
│  │   Pay when your order arrives                        │ │
│  │                                                      │ │
│  │ ○ 📱 Online Payment (Seller QR)                      │ │
│  │   Scan QR and pay digitally                          │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  [🛵 Place Order (Cash on Delivery)]                       │
└────────────────────────────────────────────────────────────┘
```

**Note**: Restaurant location is captured automatically in the background when order is created. Customer doesn't see it, but it's stored in the order.

---

## 3️⃣ Delivery Rider Dashboard

### Location: `/delivery-rider`
### Who Sees It: Delivery riders

```
┌────────────────────────────────────────────────────────────┐
│  🛵 Delivery Dashboard                      ← Home         │
│  ● Live — updates automatically                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  [📦 Available (3)]  [🛵 My Deliveries (1)]                │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Order #A1B2C3D4                                            │
│  💰 Rs. 500.00 · 💵 COD                                     │
│  📍 Boudhanath, Near Stupa                                  │
│  📞 9841234567                                              │
│  May 25, 2:30 PM                                            │
│                                                [✓ Accept]   │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Order #E5F6G7H8                                            │
│  💰 Rs. 350.00 · 📱 Online                                  │
│  📍 Patan Durbar Square                                     │
│  📞 9851234567                                              │
│  May 25, 2:45 PM                                            │
│                                                [✓ Accept]   │
└────────────────────────────────────────────────────────────┘
```

---

## 4️⃣ Delivery Rider Order Detail (THE KEY FEATURE!)

### Location: `/delivery-rider?order_id=xxx`
### Who Sees It: Delivery riders

```
┌────────────────────────────────────────────────────────────┐
│  🛵 Manage Delivery                    ← Dashboard         │
│  #A1B2C3D4  ● Live                                         │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Order Progress                                             │
│  ─────────────────────────────────────────────────────────│
│  ✓  ✅  Order Accepted                            Done     │
│  │                                                          │
│  ●  👨‍🍳  Preparing                      ● In progress       │
│  │                                                          │
│  ○  🛵  Out for Delivery                                   │
│  │                                                          │
│  ○  🎉  Delivered                                          │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  🗺️ Live Delivery Tracking                                 │
│  ● Rider location updating live                            │
│  ─────────────────────────────────────────────────────────│
│  ┌──────────────────────────────────────────────────────┐ │
│  │                                                      │ │
│  │         🍽️ Restaurant (Thamel)                       │ │
│  │              │                                       │ │
│  │              │ ← Pickup point                        │ │
│  │              │                                       │ │
│  │              │                                       │ │
│  │         🛵 Rider (Moving)                            │ │
│  │              │                                       │ │
│  │              │ ← Live tracking                       │ │
│  │              │                                       │ │
│  │              │                                       │ │
│  │         🏠 Customer (Boudhanath)                      │ │
│  │                                                      │ │
│  │              ← Delivery point                        │ │
│  │                                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  🍽️ Restaurant    🛵 Rider      🏠 Customer                │
│     Located         Tracking       Located                 │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  ⏱ Estimated Delivery Time                                 │
│  ─────────────────────────────────────────────────────────│
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Estimated arrival                                    │ │
│  │ 3:15 PM                                              │ │
│  │ May 25, 2026, 3:15 PM                                │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  Set ETA (minutes from now)                                │
│  [15m] [20m] [30m] [45m] [60m] [custom] [Set ETA]         │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Order Details                                              │
│  ─────────────────────────────────────────────────────────│
│  Total                                        Rs. 500.00   │
│  Payment                                      💵 Cash on   │
│                                                  Delivery   │
│  Placed                                       May 25, 2:30 │
│  Address                    Boudhanath, Near Stupa,        │
│                            Kathmandu                        │
│  Phone                                        9841234567   │
│  Restaurant                                   Thakali       │
│                                              Express        │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Items                                                      │
│  ─────────────────────────────────────────────────────────│
│  Chicken Momo ×2                              Rs. 150.00   │
│  Thakali Set ×1                               Rs. 350.00   │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Actions                                                    │
│  ─────────────────────────────────────────────────────────│
│  [👨‍🍳 Start Preparing]                                      │
│                                                             │
│  [✗ Reject & Return to Pool]                               │
└────────────────────────────────────────────────────────────┘
```

### Key Features on This Page:
1. **Order Progress**: Visual timeline of delivery status
2. **Live Map**: Shows 3 points (Restaurant, Rider, Customer)
3. **ETA Management**: Set estimated delivery time
4. **Order Details**: Full order information
5. **Action Buttons**: Update status, reject order

---

## 5️⃣ Customer Order Tracking

### Location: `/orders?order_id=xxx`
### Who Sees It: Customers

```
┌────────────────────────────────────────────────────────────┐
│  📦 Track Order                            ← Home          │
│  #A1B2C3D4  ● Live                                         │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  🗺️ Live Delivery Tracking                                 │
│  ● Rider location updating live                            │
│  ─────────────────────────────────────────────────────────│
│  ┌──────────────────────────────────────────────────────┐ │
│  │                                                      │ │
│  │         🍽️ Restaurant                                 │ │
│  │              │                                       │ │
│  │              │                                       │ │
│  │         🛵 Rider (On the way!)                       │ │
│  │              │                                       │ │
│  │              │                                       │ │
│  │         🏠 Your Location                             │ │
│  │                                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  Your order is on the way!                                 │
│  Estimated arrival: 3:15 PM                                │
└────────────────────────────────────────────────────────────┘
```

**Customer Benefits**:
- See where restaurant is (pickup point)
- See where rider is (live tracking)
- See their own location (delivery point)
- Know when rider picks up from restaurant
- Track entire journey

---

## 🎨 Color Coding

### Map Markers
- 🍽️ **Restaurant** (Orange/Red) - Pickup point
- 🛵 **Rider** (Blue) - Live tracking
- 🏠 **Customer** (Green) - Delivery point

### Status Colors
- **Pending**: Gray
- **Confirmed**: Blue
- **Preparing**: Yellow
- **Out for Delivery**: Purple
- **Delivered**: Green

---

## 📱 Responsive Design

All pages are mobile-responsive:
- Works on phones, tablets, desktops
- Touch-friendly buttons
- Readable text sizes
- Optimized map controls

---

## ✨ Interactive Elements

### Buttons
- **Get Current Location**: Captures GPS coordinates
- **Save**: Validates and saves data
- **Accept Order**: Assigns rider to order
- **Status Updates**: Changes order status
- **Set ETA**: Updates estimated delivery time

### Real-time Updates
- Map updates every 5 seconds
- Status changes reflect immediately
- Live notifications
- Auto-refresh on changes

---

## 🎯 User Experience Flow

### Seller Journey
```
Login → Profile → Set Location → Save
(One-time setup, 2 minutes)
```

### Customer Journey
```
Browse → Add to Cart → Checkout → Enter Address → Place Order
→ Track Delivery (see 3 points on map)
```

### Rider Journey
```
Login → Dashboard → Accept Order → See Map (3 points)
→ Update Status → Deliver → Mark Complete
```

---

## 💡 Tips for Users

### For Sellers
- Use "Get Current Location" while at your restaurant
- Double-check coordinates before saving
- Update if you move locations

### For Customers
- Enter complete delivery address
- Include landmarks in notes
- Keep phone accessible

### For Riders
- Check map before starting delivery
- Update status at each step
- Set realistic ETA

---

## 🎉 Result

A clean, intuitive interface that makes two-point delivery tracking easy for everyone!
