# 🛠️ ACTUAL Puck Field Types Reference

## ✅ Real Built-in Field Types Available in Puck

These are the **official** field types from Puck documentation:

## 📝 Basic Input Fields

### 1. `text` - Single Line Text Input

```tsx
fields: {
  title: { type: "text" },
  url: { type: "text" },
  email: { type: "text" },
}
```

### 2. `textarea` - Multi-line Text Input

```tsx
fields: {
  content: { type: "textarea" },
  description: { type: "textarea" },
}
```

### 3. `number` - Number Input

```tsx
fields: {
  width: { type: "number" },
  fontSize: { type: "number" },
  quantity: { type: "number" },
}
```

## 🎯 Selection Fields

### 4. `select` - Dropdown Selection

```tsx
fields: {
  size: {
    type: "select",
    options: [
      { label: "Small", value: "sm" },
      { label: "Medium", value: "md" },
      { label: "Large", value: "lg" },
    ],
  },
}
```

### 5. `radio` - Radio Button Group

```tsx
fields: {
  alignment: {
    type: "radio",
    options: [
      { label: "Left", value: "left" },
      { label: "Center", value: "center" },
      { label: "Right", value: "right" },
    ],
  },
}
```

## 📋 Complex Structure Fields

### 6. `array` - Repeatable List Items

```tsx
fields: {
  buttons: {
    type: "array",
    arrayFields: {
      text: { type: "text" },
      url: { type: "text" },
      style: {
        type: "select",
        options: [
          { label: "Primary", value: "primary" },
          { label: "Secondary", value: "secondary" },
        ]
      },
    },
  },
}
```

### 7. `object` - Nested Object Fields

```tsx
fields: {
  settings: {
    type: "object",
    objectFields: {
      backgroundColor: { type: "text" },
      borderRadius: { type: "number" },
      theme: {
        type: "select",
        options: [
          { label: "Light", value: "light" },
          { label: "Dark", value: "dark" },
        ]
      },
    },
  },
}
```

## 🌐 Advanced Fields

### 8. `external` - External Data Source

```tsx
fields: {
  product: {
    type: "external",
    fetchList: async () => {
      const response = await fetch("/api/products");
      const data = await response.json();
      return data.map(item => ({
        label: item.name,
        value: item.id,
      }));
    },
  },
}
```

### 9. `slot` - Component Composition Area

```tsx
fields: {
  children: {
    type: "slot",
    // Allows nested Puck components
  },
}
```

### 10. `custom` - Custom Field Implementation

```tsx
fields: {
  colorPicker: {
    type: "custom",
    render: ({ name, onChange, value }) => (
      <div>
        <label>{name}</label>
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    ),
  },
}
```

## 🚫 IMPORTANT: No Checkbox Field!

Puck does **NOT** have a `checkbox` field type.

## ✅ Boolean Values - The Right Way

Use `select` with string values for boolean options:

```tsx
// ✅ CORRECT - Use select for boolean
fields: {
  showBorder: {
    type: "select",
    options: [
      { label: "Show", value: "true" },
      { label: "Hide", value: "false" },
    ],
  },
}

// In your component:
render: ({ showBorder }) => (
  <div style={{
    border: showBorder === 'true' ? '1px solid #ddd' : 'none'
  }}>
    Content
  </div>
)
```

## 🎨 Field Options & Customization

### Add Placeholders

```tsx
fields: {
  email: {
    type: "text",
    placeholder: "Enter your email"
  },
}
```

### Set Min/Max for Numbers

```tsx
fields: {
  quantity: {
    type: "number",
    min: 1,
    max: 100
  },
}
```

### Group Select Options

```tsx
fields: {
  category: {
    type: "select",
    options: [
      { label: "Fruits", value: "", disabled: true },
      { label: "Apple", value: "apple" },
      { label: "Orange", value: "orange" },
      { label: "Vegetables", value: "", disabled: true },
      { label: "Carrot", value: "carrot" },
    ],
  },
}
```

## 🔥 Your Current Working Example

In your `ShowcaseBlock`, you can see all these field types in action:

- ✅ `text` - title field
- ✅ `textarea` - description field
- ✅ `number` - width, padding, borderRadius
- ✅ `select` - theme, showBorder, isHighlighted, showShadow
- ✅ `radio` - alignment options
- ✅ `array` - links with nested fields
- ✅ `object` - settings with nested fields

## 🚀 Test Your Components

1. Start dev server: `npm run dev`
2. Visit: `http://localhost:3000/edit`
3. Try your `ShowcaseBlock` component!
4. See all field types working together

This is the complete, accurate list of Puck field types! 🎯
