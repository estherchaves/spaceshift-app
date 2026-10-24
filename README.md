# SpaceShift

Estúdio de design de interiores no browser: desenhe uma divisão, coloque
móveis à escala, detete colisões e veja o resultado em 2D e 3D.

> Estado: **Fase 5** concluída. Vista 3D sincronizada com a planta (modos
> 2D, 3D e dividido), modelos procedimentais para todos os móveis, arrasto
> no 3D, vistas rápidas da câmara e corte automático das paredes.
> A seguir: Fase 6 (colisões e circulação).

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
