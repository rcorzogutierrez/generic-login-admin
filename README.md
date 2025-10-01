# Generic Login Admin

A modern, scalable user management system built with Angular 20 and Firebase, featuring Google Material Design and Tailwind CSS for enterprise-level user and project access control.

[![Claude Code](https://img.shields.io/badge/Powered%20by-Claude%20Code-orange?style=for-the-badge)](https://claude.ai/code)
[![TypeScript](https://img.shields.io/badge/Built%20with-TypeScript-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

## ✨ Features

- **User Management**: Complete CRUD operations for user accounts
- **Role-Based Access Control (RBAC)**: Flexible role assignment and permission management
- **Project Access Control**: Granular project-level permissions and user assignments
- **Modern UI**: Clean, responsive interface using Material Design and Tailwind CSS
- **Real-time Updates**: Firebase integration for instant data synchronization
- **Secure Authentication**: Firebase Auth implementation with multiple sign-in methods

## 🛠️ Tech Stack

- **Frontend**: Angular 20
- **Backend/Database**: Firebase (Firestore, Authentication)
- **UI Framework**: Angular Material + Tailwind CSS
- **Authentication**: Firebase Auth
- **Hosting**: Firebase Hosting (optional)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Angular CLI
- Firebase account and project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/rcorzogutierrez/generic-login-admin.git
cd generic-login-admin
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication and Firestore
   - Copy your Firebase config to `src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
  }
};
```

4. Run the development server:
```bash
ng serve
```

Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## 🔧 Configuration

### Firebase Setup

1. **Authentication**: Enable your preferred sign-in methods in Firebase Console
2. **Firestore Rules**: Update security rules based on your requirements
3. **Indexes**: Create composite indexes for complex queries if needed

### Environment Variables

Create environment files for different stages:
- `environment.ts` (development)
- `environment.prod.ts` (production)

## 📱 Usage

### Admin Dashboard
- Access the admin panel to manage users, roles, and projects
- Create and assign roles with specific permissions
- Monitor user activity and project access

### User Management
- Add, edit, and remove users
- Assign roles and project access
- Bulk operations for efficient management

### Role Management
- Create custom roles with specific permissions
- Hierarchical role structure support
- Real-time permission updates

## 🚀 Deployment

### Firebase Hosting

1. Build the project:
```bash
ng build --prod
```

2. Deploy to Firebase:
```bash
firebase deploy
```

### Other Platforms

The built files in `dist/` can be deployed to any static hosting service like Netlify, Vercel, or AWS S3.

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📋 Roadmap

- [ ] Multi-tenant support
- [ ] Advanced reporting and analytics
- [ ] API integration capabilities
- [ ] Mobile app companion
- [ ] SSO integration
- [ ] Audit logs and compliance features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Rafael Corzo** - *Initial work* - [@rcorzogutierrez](https://github.com/rcorzogutierrez)

## 🙏 Acknowledgments

- Angular team for the amazing framework
- Firebase for the robust backend services
- Material Design team for the UI components
- Tailwind CSS for utility-first styling

## 📞 Support

If you have any questions or issues, please:
- Open an issue on GitHub
- Check the [documentation](under construction)
- Contact the maintainers

---

⭐ **Star this repository if you found it helpful!**
