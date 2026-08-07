declare global {
  interface Window {
    VisanetCheckout: {
      configure: (config: any) => void
      open: () => void
    }
  }
}

export {}