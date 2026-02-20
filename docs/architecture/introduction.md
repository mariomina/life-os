# Architecture — 1. Introduction

> **Documento:** [Architecture Index](./index.md)
> **Sección:** 1 de 17

---

## 1.1 Scope del Documento

Este documento define la arquitectura técnica completa de **life-os** — un sistema operativo personal construido sobre Next.js + Supabase + Vercel. Cubre: stack de tecnología (fuente de verdad definitiva), modelos de datos conceptuales, componentes del sistema, flujos críticos, estructura de código, infraestructura, estándares de desarrollo y seguridad.

**Relación con el PRD:** Este documento es complementario al PRD v1.1. Las decisiones de producto y requisitos funcionales viven en el PRD. Las decisiones técnicas de implementación viven aquí. En caso de conflicto, este documento prevalece en lo técnico.

**Audiencia primaria:** @dev (Dex), @data-engineer (Dara), @qa (Quinn), @devops (Gage).

## 1.2 Starter Template / Base Existente

life-os parte de **TailAdmin** (`github.com/TailAdmin/free-nextjs-admin-dashboard`) como base de layout + UI framework. Este template provee:

- Next.js 16 + React 19 + Tailwind CSS 4 configurado
- Sidebar con navegación, Navbar, dark mode nativo
- ApexCharts integrado (se usará para Informes)
- Estructura de carpetas `app/` básica con App Router
- shadcn/ui pre-instalado

**Impacto en arquitectura:** La estructura de carpetas del proyecto adapta TailAdmin como punto de partida, reemplazando sus páginas de demo con las features de life-os. El sistema de estilos es Tailwind CSS 4 nativo — no se introduce CSS-in-JS ni estilos adicionales.
