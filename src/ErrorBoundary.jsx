import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Fika app crashed:", error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center", fontFamily: "system-ui, sans-serif", background: "#EFE4D2", color: "#241811" }}>
        <div>
          <div style={{ fontSize: 32, marginBottom: 8 }}>☕️💥</div>
          <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ fontSize: 14, opacity: 0.7, margin: "0 0 16px" }}>The app hit an unexpected error. Reloading usually fixes it.</p>
          <button onClick={() => location.reload()} style={{ padding: "10px 18px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 700, background: "#BC5B35", color: "#fff" }}>Reload</button>
        </div>
      </div>
    );
  }
}
