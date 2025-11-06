// Example Puck-compatible components
import type { ComponentConfig } from '@measured/puck';
import Image from 'next/image';

// Button Component
export const ButtonBlock: ComponentConfig = {
  fields: {
    text: { type: 'text' },
    variant: {
      type: 'select',
      options: [
        { label: 'Primary', value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
        { label: 'Danger', value: 'danger' },
      ],
    },
    size: {
      type: 'radio',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ],
    },
  },
  defaultProps: {
    text: 'Click me',
    variant: 'primary',
    size: 'md',
  },
  render: ({ text, variant, size }) => (
    <button
      className={`btn btn-${variant} btn-${size}`}
      style={{
        padding:
          size === 'sm'
            ? '8px 16px'
            : size === 'lg'
            ? '16px 32px'
            : '12px 24px',
        backgroundColor:
          variant === 'primary'
            ? '#007bff'
            : variant === 'danger'
            ? '#dc3545'
            : '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
      }}
    >
      {text}
    </button>
  ),
};

// Image Component
export const ImageBlock: ComponentConfig = {
  fields: {
    src: { type: 'text' },
    alt: { type: 'text' },
    width: { type: 'number' },
    height: { type: 'number' },
  },
  defaultProps: {
    src: 'https://via.placeholder.com/400x300',
    alt: 'Placeholder image',
    width: 400,
    height: 300,
  },
  render: ({ src, alt, width, height }) => (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  ),
};

// Card Component with nested fields
export const CardBlock: ComponentConfig = {
  fields: {
    title: { type: 'text' },
    content: { type: 'textarea' },
    image: {
      type: 'object',
      objectFields: {
        src: { type: 'text' },
        alt: { type: 'text' },
      },
    },
    buttons: {
      type: 'array',
      arrayFields: {
        text: { type: 'text' },
        link: { type: 'text' },
      },
    },
  },
  defaultProps: {
    title: 'Card Title',
    content: 'Card content goes here...',
    image: {
      src: 'https://via.placeholder.com/300x200',
      alt: 'Card image',
    },
    buttons: [{ text: 'Learn More', link: '#' }],
  },
  render: ({ title, content, image, buttons }) => (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '16px',
        maxWidth: '300px',
      }}
    >
      {image?.src && (
        <Image
          src={image.src}
          alt={image.alt}
          width={300}
          height={200}
          style={{ width: '100%', borderRadius: '4px', marginBottom: '12px' }}
        />
      )}
      <h3 style={{ margin: '0 0 8px 0' }}>{title}</h3>
      <p style={{ margin: '0 0 16px 0', color: '#666' }}>{content}</p>
      {buttons?.map((button, index) => (
        <a
          key={index}
          href={button.link}
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            marginRight: '8px',
          }}
        >
          {button.text}
        </a>
      ))}
    </div>
  ),
};

// Layout Components
export const ContainerBlock: ComponentConfig = {
  fields: {
    maxWidth: { type: 'number' },
    padding: { type: 'number' },
    backgroundColor: { type: 'text' },
  },
  defaultProps: {
    maxWidth: 1200,
    padding: 20,
    backgroundColor: 'transparent',
  },
  render: ({ maxWidth, padding, backgroundColor, children }) => (
    <div
      style={{
        maxWidth: `${maxWidth}px`,
        margin: '0 auto',
        padding: `${padding}px`,
        backgroundColor,
      }}
    >
      {children}
    </div>
  ),
};
