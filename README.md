<h1>
🌀 recurrentry
<div style="display: flex; gap: 10px;">
 <img src="https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/needim/ccae711fb07ccaed86d73f03c1922557/raw/badge.json" />
</div>
</h1>

An opinionated library for handling recurring payments.

## Installation

```bash
pnpm install recurrentry
bun install recurrentry
yarn add recurrentry
npm install recurrentry
```

## Features

- Supports single and recurring payments (single, weekly, monthly, yearly)
- Day-level precision (time components are ignored)
- Type-safe configuration with TypeScript
- Built-in type guards for payment configurations

## Usage

```typescript
TODO: Add usage examples
```

## Date Handling

The library operates with day-level precision using the Temporal API:

- Uses `Temporal.PlainDate` for all date operations
- All time components are ignored by design
- Helper function `createDate()` provided for easy date creation
- Dates should be provided in ISO 8601 format (YYYY-MM-DD)

## Contributing

We welcome contributions. To get started:

1. Fork the repository
2. Create a new branch for your changes
3. Make your changes and write tests if applicable
4. Submit a pull request

## License

Licensed under the [MIT License](LICENSE).
