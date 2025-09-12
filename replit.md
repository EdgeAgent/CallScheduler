# AI Phone Agent Dashboard

## Overview

An AI-powered phone call automation system built with React and Express.js that manages outreach campaigns, call scheduling, and real-time communication. The application uses AI to conduct phone conversations, book appointments, and track call outcomes with a comprehensive dashboard interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is built with React 18 using Vite as the build tool and development server. The application follows a component-based architecture with:
- **UI Framework**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query for server state management with real-time WebSocket updates
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation through hookform/resolvers

The frontend is organized into pages and reusable dashboard components, with a responsive design supporting both desktop and mobile interfaces.

### Backend Architecture
The server follows an Express.js REST API pattern with:
- **HTTP Server**: Express.js with middleware for JSON parsing, CORS, and request logging
- **WebSocket Server**: ws library for real-time client updates on call status changes
- **Storage Layer**: Abstract storage interface with in-memory implementation (designed for database expansion)
- **Service Layer**: Separate services for Twilio integration and OpenAI conversation management

The backend uses TypeScript with ESM modules and includes error handling middleware for consistent API responses.

### Data Storage Solutions
Currently implements an in-memory storage system through the `MemStorage` class, which provides:
- **User Management**: Authentication and user data storage
- **Contact Management**: Customer contact information and notes with full CRUD operations
- **Call Tracking**: Call history, status, and conversation logs
- **Appointment Scheduling**: Complete appointment management with calendar integration, monthly filtering, and deletion capabilities
- **Configuration Storage**: System settings and AI voice preferences

The storage is designed with a database abstraction layer for easy migration to PostgreSQL using Drizzle ORM (schema defined but not yet connected). Enhanced with delete operations and monthly appointment queries for calendar functionality.

### Authentication and Authorization
Basic user management system with:
- Username/password authentication
- Session-based authorization (designed for expansion)
- User-specific data isolation

### AI and Communication Integration
**OpenAI Integration**: Uses GPT-5 for intelligent conversation handling with:
- Context-aware responses based on call purpose and history
- Intent recognition for scheduling, continuation, or call termination
- Structured JSON responses for consistent data parsing

**Twilio Integration**: Manages phone communication through:
- Outbound call initiation with webhook URLs
- Call status tracking and real-time updates
- Voice recording and call duration monitoring
- Multiple voice options and speaking speed controls

### Real-time Features
WebSocket implementation provides live updates for:
- Active call status changes
- New appointment bookings
- Dashboard statistics refresh
- Call completion notifications

The system broadcasts updates to all connected clients automatically when call states change, ensuring the dashboard stays current without manual refreshes.

## External Dependencies

### Third-party Services
- **Twilio**: Phone service integration for making and managing calls
- **OpenAI**: AI conversation engine using GPT-5 model
- **Neon Database**: PostgreSQL hosting (configured but not actively used)

### Key Libraries
- **Frontend**: React, Vite, TanStack Query, Radix UI, Tailwind CSS, Wouter
- **Backend**: Express.js, WebSocket (ws), Twilio SDK, OpenAI SDK
- **Database**: Drizzle ORM with PostgreSQL adapter, Neon serverless driver
- **Development**: TypeScript, ESBuild, PostCSS, Autoprefixer

### Build and Development
- **Vite**: Frontend build tool with HMR and React plugin
- **ESBuild**: Server-side TypeScript compilation and bundling
- **TypeScript**: Full-stack type safety with path mapping
- **PostCSS**: CSS processing with Tailwind CSS integration

## Recent Changes

### Calendar and Client Management System (September 12, 2025)
- **Complete calendar system**: Built monthly calendar grid interface with click-to-schedule functionality for appointment booking
- **Appointment management**: Full CRUD operations - create appointments by clicking calendar dates, view scheduled appointments, delete from Today's Appointments panel
- **Client management interface**: Contact creation, editing, and deletion through dedicated forms and management panels
- **API endpoints**: Added DELETE endpoints for appointments and contacts, plus monthly appointment queries (/api/appointments/month/:year/:month)
- **Enhanced navigation**: Calendar page integrated into sidebar navigation with proper routing to /calendar
- **Validation system**: Fixed critical backend validation to handle ISO string dates from frontend datetime inputs
- **Storage operations**: Extended storage interface with delete methods and monthly filtering capabilities
- **User interface**: Responsive calendar grid, appointment dialogs, contact forms, and real-time updates

### API Configuration System (September 12, 2025)
- **Complete API credential configuration system**: Users can now supply their own Twilio and OpenAI API keys through a secure settings interface instead of relying on hardcoded environment variables
- **Security implementation**: All API responses mask sensitive credentials as "***HIDDEN***" to prevent exposure
- **Runtime service updates**: Services automatically apply new credentials when configuration changes
- **Server initialization**: Stored configuration is loaded and applied to services on server startup
- **Settings page**: Comprehensive UI for managing Twilio credentials (Account SID, Auth Token, Phone Number), OpenAI API key, and general settings (voice, speed, AI model)
- **Navigation integration**: Settings accessible via sidebar navigation with proper routing