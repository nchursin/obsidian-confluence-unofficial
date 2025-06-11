export class Notice {
  constructor(message: string) {
    // Optionally, store or log the message for test assertions
  }
}

export class Component {
  load() {}
}

export const MarkdownRenderer = {
  render: jest.fn(),
};

// Add other mocks as needed for your tests 