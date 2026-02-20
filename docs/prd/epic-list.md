# life-os PRD — 5. Epic List

> **Documento:** [PRD Index](./index.md)
> **Sección:** 5 de 8

---

| #   | Epic                              | Módulos                       | Dependencias   | Prioridad  |
| --- | --------------------------------- | ----------------------------- | -------------- | ---------- |
| E1  | Foundation & Auth                 | Setup, DB Schema, CI/CD, Auth | —              | 🔴 CRÍTICA |
| E2  | Perfil & Diagnóstico              | Módulo 0                      | E1             | 🔴 Alta    |
| E3  | Áreas de Vida & OKRs              | Módulos 1-2                   | E1, E2         | 🔴 Alta    |
| E4  | Proyectos, Hábitos & Milestones   | Módulo 3                      | E1, E3         | 🟡 Alta    |
| E5  | Calendario & Time Tracking        | Módulo 5                      | E1, E3, E4     | 🔴 CRÍTICA |
| E6  | Inbox & IA Calendarización        | Módulo 6                      | E1, E5         | 🟡 Alta    |
| E7  | Habilidades                       | Módulo 4                      | E1, E3         | 🟢 Media   |
| E8  | Informes & Motor de Correlaciones | Módulo 7                      | E1, E5 + todos | 🟢 Media   |

**Orden de ejecución:**

```
E1 → E2 → E3 ─┬─→ E4 → E5 → E6
               └─→ E7          └→ E8
```
