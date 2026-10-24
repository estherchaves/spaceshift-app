# SpaceShift

Estúdio de design de interiores no browser: desenhe uma divisão, coloque
móveis à escala, detete colisões e veja o resultado em 2D e 3D.

> Estado: **Fase 4** concluída. Editor 2D completo com símbolos de planta
> para cada tipo de móvel, catálogo com pré-visualizações, acabamentos, cor
> e bloqueio. A seguir: Fase 5 (vista 3D sincronizada com a planta).

## Requisitos

- Node.js 20.19+ (testado com Node 22) e npm 10+

## Comandos

```bash
npm install        # instalar dependências
npm run dev        # servidor de desenvolvimento (http://localhost:5173)
npm run test       # testes (Vitest)
npm run test:watch # testes em modo watch
npm run lint       # Oxlint (avisos fazem falhar)
npm run build      # build de produção em dist/
npm run preview    # servir o build
npm run check      # lint + testes + build
```

## Documentação

- [Arquitetura e decisões técnicas](docs/ARCHITECTURE.md)

## Stack

React 19 (JavaScript) · Vite 8 · React Three Fiber + Drei + Three.js · Zustand ·
Lucide React · Vitest + Testing Library.
