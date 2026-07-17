# Contributing to CareerOS AI

Thank you for your interest in contributing to CareerOS AI! We welcome contributions to help improve the platform.

---

## 🏗️ Development Process

1.  **Fork the Repository:** Create a personal fork of the repository on GitHub.
2.  **Clone the Fork:** Clone the fork locally to your development environment.
3.  **Create a Feature Branch:** Always develop on a named branch (`feature/your-feature` or `bugfix/your-fix`).
4.  **Local Setup:** Follow the steps in the [README.md](README.md) to set up the development environment.
5.  **Write Tests:** Add unit tests for any new logic in the backend (`backend/tests/`).
6.  **Verify Linting & Types:** Ensure all backend and frontend validation passes before submitting a Pull Request.
7.  **Submit PR:** Open a Pull Request targeting the `develop` or `main` branch of the upstream repository.

---

## 🧪 Code Quality Standards

*   **Python (Backend):** Follow PEP 8 guidelines. Write type annotations for new functions. Use async/await patterns for database queries.
*   **TypeScript/React (Frontend):** Use functional components, hooks, and clean Tailwind styling. Use semantic HTML elements and ensure proper ARIA roles/focus management.
*   **Database Migrations:** Never edit existing Alembic migrations. Always generate new files using `alembic revision --autogenerate`.

---

## 🤝 Code of Conduct

We are committed to providing a welcoming, safe, and friendly environment for all contributors. Please review and adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).
