# Quick Reference: Two-Point Delivery System

## 🚀 One-Minute Setup

```bash
# 1. Run SQL (in Supabase SQL Editor)
Run file: supabase/add_restaurant_location.sql

# 2. Seller sets location (in browser)
Login → Profile → Restaurant Location → Get Current Location → Save

# 3. Test
Place order → Accept as rider → See map with 3 points ✓
```

---

## 📊 Three Points Tracked

| Point | Icon | Color | Updates |
|-------|------|-------|---------|
| Restaurant | 🍽️ | Orange | Static (from seller profile) |
| Rider | 🛵 | Blue | Live (every 5 seconds) |
| Customer | 🏠 | Green | Static (from order) |

---

## 🗂️ Files Changed

| File | Type | Purpose |
|------|------|---------|
| `supabase/add_restaurant_location.sql` | NEW | Database migration |
| `app/profile/page.js` | MODIFIED | Seller location form |
| `app/checkout/page.js` | MODIFIED | Capture restaurant location |
| `app/delivery-rider/page.js` | EXISTING | Already supports 3 points |
| `app/components/LiveDeliveryTracker.js` | EXISTING | Already supports 3 points |

---

## 💾 Database Columns

### profiles table
```sql
restaurant_latitude    DECIMAL(10,8)  -- NEW
restaurant_longitude   DECIMAL(11,8)  -- NEW
restaurant_address     TEXT           -- NEW
```

### orders table
```sql
restaurant_latitude    DECIMAL(10,8)  -- EXISTING
restaurant_longitude   DECIMAL(11,8)  -- EXISTING
customer_latitude      DECIMAL(10,8)  -- EXISTING
customer_longitude     DECIMAL(11,8)  -- EXISTING
```

---

## 🎯 User Actions

### Seller (One-time)
```
Profile → Restaurant Location → Get Location → Save
```

### Customer (Every order)
```
Checkout → Enter Address → Place Order
```

### Rider (Every delivery)
```
Accept Order → See Map → Update Status → Deliver
```

---

## 🗺️ Map Display

```
🍽️ Restaurant (Pickup)
    ↓
🛵 Rider (Live)
    ↓
🏠 Customer (Delivery)
```

---

## ✅ Testing Checklist

- [ ] SQL migration run
- [ ] Seller can set location
- [ ] Location saves successfully
- [ ] Order includes restaurant location
- [ ] Map shows 3 points
- [ ] Rider location updates live

---

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| Location not showing | Seller must set in Profile |
| GPS not working | Allow browser permission |
| Map empty | Run SQL migration |
| Coordinates invalid | Lat: -90 to 90, Lng: -180 to 180 |

---

## 📍 Test Coordinates (Kathmandu)

```
Thamel:        27.7172, 85.3240
Durbar Square: 27.7045, 85.3077
Boudhanath:    27.7215, 85.3618
```

---

## 🔗 Documentation

- **Setup**: `RESTAURANT_LOCATION_SETUP.md`
- **Quick Start**: `QUICK_SETUP_RESTAURANT_LOCATION.md`
- **Flow**: `TWO_POINT_DELIVERY_FLOW.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`
- **UI Guide**: `UI_SCREENSHOTS_GUIDE.md`

---

## 💡 Key Benefits

✅ Riders know pickup location  
✅ Riders know delivery location  
✅ Real-time tracking  
✅ Professional experience  
✅ Reduced delivery errors  

---

## 🎉 Done!

Your system now has **two-point delivery tracking**! 🚀
