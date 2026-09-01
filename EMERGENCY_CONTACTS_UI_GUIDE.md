# Emergency Contacts - UI Guide

## Visual States

### 1. Expanded State (Edit Mode)
```
┌─────────────────────────────────────────────┐
│ Emergency SOS contacts              ▴       │
├─────────────────────────────────────────────┤
│ Add up to 3 emergency contacts. Each        │
│ contact must have a unique email and phone. │
│                                              │
│ ┌─ CONTACT 1 ────────────────────────────┐ │
│ │ Full name                                │ │
│ │ [John Doe                            ]   │ │
│ │                                          │ │
│ │ Email                                    │ │
│ │ [john@example.com                    ]   │ │
│ │                                          │ │
│ │ Phone number                             │ │
│ │ [1234567890                          ]   │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ┌─ CONTACT 2 ────────────────────────────┐ │
│ │ Full name                                │ │
│ │ [Jane Smith                          ]   │ │
│ │                                          │ │
│ │ Email                                    │ │
│ │ [jane@example.com                    ]   │ │
│ │                                          │ │
│ │ Phone number                             │ │
│ │ [9876543210                          ]   │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ┌───────────────────────────────────────┐   │
│ │     + Add another contact              │   │
│ └───────────────────────────────────────┘   │
│                                              │
│ ┌───────────────────────────────────────┐   │
│ │   Save emergency contacts              │   │
│ └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 2. Collapsed State (Summary View)
```
┌─────────────────────────────────────────────┐
│ Emergency SOS contacts              ▾       │
│ 2 contacts saved                            │
├─────────────────────────────────────────────┤
│ ┃ John Doe                                  │
│ ┃ john@example.com • 1234567890             │
│                                              │
│ ┃ Jane Smith                                │
│ ┃ jane@example.com • 9876543210             │
│                                              │
│ ┌───────────────────────────────────────┐   │
│ │        Edit contacts                   │   │
│ └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 3. Empty Collapsed State
```
┌─────────────────────────────────────────────┐
│ Emergency SOS contacts              ▾       │
├─────────────────────────────────────────────┤
│   No emergency contacts saved yet           │
│                                              │
│ ┌───────────────────────────────────────┐   │
│ │        Edit contacts                   │   │
│ └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## Interaction Flows

### Flow 1: First Time Setup
```
User Opens App
      ↓
Section is EXPANDED (no contacts yet)
      ↓
User fills in Contact 1
      ↓
Clicks "Save emergency contacts"
      ↓
Validation passes (unique email & phone)
      ↓
Success alert + green banner
      ↓
Section AUTO-COLLAPSES
      ↓
Shows: "1 contact saved" + mini card
```

### Flow 2: Adding More Contacts
```
User sees collapsed summary
      ↓
Clicks header or "Edit contacts"
      ↓
Section EXPANDS
      ↓
Shows existing contact(s) + empty slots
      ↓
User clicks "+ Add another contact"
      ↓
Contact 2 form appears
      ↓
User fills it in
      ↓
Clicks "Save emergency contacts"
      ↓
Success → Section collapses
      ↓
Shows: "2 contacts saved" + both mini cards
```

### Flow 3: Duplicate Email Error
```
User has Contact 1: john@example.com
      ↓
User adds Contact 2: john@example.com (same!)
      ↓
Clicks "Save emergency contacts"
      ↓
❌ VALIDATION FAILS
      ↓
Alert: "The email 'john@example.com' is used more than once..."
      ↓
Section stays EXPANDED
      ↓
User corrects the email
      ↓
Saves again → Success
```

### Flow 4: Page Reload
```
User reloads page
      ↓
App loads saved profile from Firebase
      ↓
Has emergencyContacts? YES
      ↓
Section loads COLLAPSED
      ↓
Shows summary with saved contacts
      ↓
User can click to expand if needed
```

## Color Coding

### Status Colors
- **Green (#16a34a)**: Success, saved contacts summary
- **Blue (#2378bd, #073b82)**: Titles, labels, actions
- **Red (error alerts)**: Validation failures
- **Gray (#5d7391, #8a9db5)**: Helper text, placeholders

### Visual Elements
- **Green left border**: Mini contact cards (collapsed view)
- **Blue background**: Edit contacts button
- **Light blue/gray**: Input fields and contact cards

## Accessibility Features

### Screen Reader Support
- Header is pressable with clear toggle indication
- Contact cards have proper labels
- Error alerts are announced immediately
- Success messages use `accessibilityRole="alert"`

### Keyboard Navigation
- Tab through all inputs
- Enter key submits save
- Escape could close expanded section (future)

### Visual Indicators
- Clear expand/collapse icons (▴ ▾)
- Color contrast meets WCAG AA standards
- Touch targets are 44px minimum

## Responsive Behavior

### Mobile Portrait
- Full width cards
- Stacked layout
- Touch-friendly button sizes

### Tablet/Landscape
- Same layout (maintains consistency)
- Could add max-width for better readability

## Animation Opportunities (Future)

Potential smooth transitions:
1. **Expand/collapse**: Slide animation (200ms)
2. **Save success**: Fade out expansion, fade in summary
3. **Add contact**: Slide in new contact card
4. **Error shake**: Input fields on validation error

## Component Structure

```javascript
<View style={styles.sosCard}>
  {/* Always visible - clickable header */}
  <Pressable onPress={toggle}>
    <Text>Emergency SOS contacts</Text>
    {collapsed && <Text>X contacts saved</Text>}
    <Text>{expanded ? '▴' : '▾'}</Text>
  </Pressable>

  {/* Conditionally rendered based on sosExpanded */}
  {expanded ? (
    <>
      <Text>Helper text</Text>
      {contacts.map(...)}
      <Button>Add another</Button>
      <Button>Save</Button>
    </>
  ) : (
    <>
      {contacts.map(miniCard)}
      <Button>Edit contacts</Button>
    </>
  )}
</View>
```

## State Management

### Key State Variables
```javascript
const [sosExpanded, setSosExpanded] = useState(true);
const [emergencyContacts, setEmergencyContacts] = useState([...]);
const [visibleEmergencyContactCount, setVisibleEmergencyContactCount] = useState(1);
```

### State Updates
- **On save success**: `setSosExpanded(false)`
- **On click header**: `setSosExpanded(!sosExpanded)`
- **On load with contacts**: `setSosExpanded(false)`
- **On click Edit**: `setSosExpanded(true)`

## Error States

### Duplicate Email
```
Alert: "Duplicate email"
Message: "The email 'john@example.com' is used more than once. 
         Each emergency contact must have a unique email address."
```

### Duplicate Phone
```
Alert: "Duplicate phone"
Message: "The phone number '1234567890' is used more than once. 
         Each emergency contact must have a unique phone number."
```

### Incomplete Contact
```
Alert: "SOS contact incomplete"
Message: "Each visible emergency contact must include a name, email, 
         and phone number."
```

### No Profile
```
Alert: "Profile required"
Message: "Please enter your email in your profile before saving 
         SOS contacts."
```

## Best Practices Applied

✅ **Progressive Disclosure**: Hide complexity after initial setup
✅ **Data Validation**: Prevent duplicate entries
✅ **Clear Feedback**: Success banners and error alerts
✅ **Persistent State**: Auto-collapse on reload if contacts exist
✅ **Easy Access**: One-click to edit existing contacts
✅ **Visual Hierarchy**: Clear titles, labels, and grouping
✅ **Touch-Friendly**: Large tap targets, clear buttons
✅ **Informative**: Shows contact count and details when collapsed

## Developer Notes

### Testing Checklist
- [ ] Toggle collapse/expand
- [ ] Save with unique contacts
- [ ] Try duplicate email
- [ ] Try duplicate phone  
- [ ] Reload page with saved contacts
- [ ] Reload page without contacts
- [ ] Add 3rd contact
- [ ] Edit existing contact
- [ ] Verify Firebase save
- [ ] Check mobile responsive
- [ ] Test keyboard navigation
- [ ] Test screen reader

### Debug Tips
```javascript
// Check current state
console.log('SOS Expanded:', sosExpanded);
console.log('Emergency Contacts:', emergencyContacts);
console.log('Visible Count:', visibleEmergencyContactCount);

// Force expand/collapse
setSosExpanded(true);  // Expand
setSosExpanded(false); // Collapse
```
