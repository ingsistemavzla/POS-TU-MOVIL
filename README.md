# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/95a124bf-a63a-4a5f-b167-849d3e14d464

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/95a124bf-a63a-4a5f-b167-849d3e14d464) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/95a124bf-a63a-4a5f-b167-849d3e14d464) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## 📌 Punto de Restauración Estable: V-READY

Este proyecto tiene un punto de restauración estable identificado como **V-READY**.

### ¿Qué es V-READY?

`V-READY` es un tag de Git que marca una versión estable, optimizada y probada del proyecto. Es útil para:
- Volver a un punto conocido si algo falla
- Crear nuevas ramas desde una versión estable
- Marcar un hito importante en el desarrollo

### Cómo usar V-READY

```bash
# Ver información del checkpoint
git show V-READY

# Restaurar a este punto
git checkout V-READY

# Crear una nueva rama desde V-READY
git checkout -b mi-nueva-rama V-READY

# Ver cambios desde V-READY hasta ahora
git log V-READY..HEAD
```

Para más detalles, consulta [docs/V-READY_CHECKPOINT.md](docs/V-READY_CHECKPOINT.md)