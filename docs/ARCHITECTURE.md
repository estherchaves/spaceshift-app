# SpaceShift: arquitetura

Este documento descreve a arquitetura do SpaceShift, as decisões técnicas e a
estrutura de pastas completa. As pastas marcadas com uma fase ainda não
existem: são criadas quando essa fase for implementada.

## 1. Princípios

1. **Uma única fonte de verdade.** O projeto (divisão + disposições + móveis)
   vive num store Zustand. A planta 2D e a cena 3D são duas *vistas* que leem
   o mesmo estado e enviam as mesmas ações. Não há dados duplicados entre vistas.
2. **Domínio independente da interface.** Tudo o que está em `src/core/` é
   JavaScript puro, sem React nem DOM: unidades, coordenadas, geometria,
   validação e modelo de dados. É testado isoladamente e pode ser reutilizado
   num backend Node no futuro.
3. **Metros no modelo, píxeis só no ecrã.** O modelo guarda medidas em metros
   (arredondadas ao milímetro). A conversão para píxeis acontece apenas na
   camada de visualização, através de um objeto `viewport`.
4. **Dependências num só sentido.** `core` ← `store` ← `features` ← `pages`/`app`.
   O `core` nunca importa nada de cima. O lint (`import/no-cycle`) falha se
   surgir uma dependência circular.
5. **Persistência atrás de uma interface.** O editor fala com um
   `ProjectRepository`; a primeira implementação usa LocalStorage e uma futura
   implementação pode falar com uma API (autenticação, base de dados, cloud)
   sem mexer no editor.

## 2. Stack e decisões técnicas

| Área | Escolha | Porquê |
| --- | --- | --- |
| Linguagem | JavaScript (ES2022) + JSDoc | Pedido do projeto. Os contratos de dados estão em `core/model/types.js` como `@typedef`, o que dá autocompletar no editor sem TypeScript. |
| Build | Vite 8 | Arranque instantâneo, HMR, build com Rolldown. |
| UI | React 19 | Componentes funcionais e hooks. |
| 2D | SVG renderizado pelo React | Vetorial e nítido em qualquer zoom. Cada móvel é um elemento DOM (eventos de rato, acessibilidade, testes com Testing Library) e a planta exporta-se para PNG desenhando o SVG num `<canvas>`. Para dezenas ou poucas centenas de objetos o desempenho é amplamente suficiente. |
| 3D | three + @react-three/fiber + @react-three/drei | Cena declarativa ligada ao mesmo store. Drei fornece `OrbitControls`, `ContactShadows`, etc. A cena 3D será carregada com `React.lazy` para não atrasar a abertura da planta. |
| Estado | Zustand | Store pequeno, sem boilerplate, com seletores para evitar re-renderizações e acessível fora do React (útil para atalhos de teclado e testes). |
| Undo/Redo | Histórico próprio de *snapshots* do documento | O documento é pequeno e imutável, por isso guardar estados é simples e fiável. Os arrastos são agrupados numa transação: um único passo no histórico por gesto. |
| Ícones | lucide-react | Traço fino, coerente com a direção visual. |
| Persistência | LocalStorage, com esquema versionado | Ver secção 5. |
| Testes | Vitest + Testing Library + jsdom | Mesma configuração do Vite, rápido. |
| Lint | Oxlint (vem no template oficial do Vite 8) | Muito rápido. Ativámos os plugins `react`, `import` e `vitest` e as regras `import/no-cycle` e `no-unused-vars`. Avisos fazem falhar o lint. |
| CSS | CSS moderno com *custom properties* e um ficheiro `.css` por componente | Sem framework, como pedido. Tokens em `styles/tokens.css`. |

Sem TypeScript, sem bibliotecas externas de modelos 3D e sem URLs remotos:
todos os móveis 3D serão geometria procedimental do Three.js.

## 3. Sistema de coordenadas

```
           X →
   (0,0) ┌──────────────────┐
         │                  │
   Z ↓   │     divisão      │  depth (largura da divisão)
         │                  │
         └──────────────────┘ (width, depth)
              width (comprimento)
```

- **Mundo (metros):** origem no canto superior esquerdo *interior* da divisão.
  X para a direita, Z para baixo na planta. As paredes são desenhadas por fora
  deste retângulo, por isso o espaço útil é exatamente `width × depth`.
- **Ecrã (píxeis CSS):** `ecrã = mundo × scale + offset`. O `scale` (px/m) é
  igual nos dois eixos, logo as proporções mantêm-se com qualquer zoom ou
  tamanho de janela. Ver `core/coordinates/viewport.js`.
- **Cena 3D:** o mesmo X e Z, com Y para cima. Um objeto com altura `h` e
  elevação `e` fica com o centro em `y = e + h/2`.
- **Rotação:** guardada em graus `[0, 360)`, no sentido horário visto de cima.
  Em Three.js `rotation.y = −graus × π/180`. Ver `core/coordinates/sceneMapping.js`.
- **Móveis:** `position` é o centro. `dimensions.width` é o comprimento no eixo
  X local, `dimensions.depth` a largura no eixo Z local e `dimensions.height` a
  altura. Na interface aparecem como Comprimento / Largura / Altura.

## 4. Geometria

- Cada móvel é um retângulo orientado (OBB). `getFootprint()` devolve os 4
  cantos reais tendo em conta a rotação.
- **Colisões:** Teorema do Eixo Separador (SAT) entre polígonos convexos, com
  tolerância de 1 mm para que móveis encostados não contem como sobrepostos.
  Devolve também a profundidade de penetração. Não comparamos centros nem
  caixas alinhadas (os testes incluem um caso em que as caixas alinhadas
  dariam um falso positivo).
- **Limites da divisão:** os cantos rodados são comparados com as paredes e
  devolvemos quanto o móvel ultrapassa cada parede.
- **Formas reais (Fase 6):** `shapes.js` descreve a pegada de cada tipo como
  polígonos convexos no referencial local: retângulo, elipse (mesa redonda,
  64 lados, erro < 1 mm) e L (sofá de canto, dois retângulos). O SAT corre
  parte a parte, por isso continua exato e os cantos vazios deixam de dar
  falsos conflitos.
- **Distâncias e recortes:** `distance.js` mede a distância mínima entre
  polígonos convexos (com a cota centrada no troço paralelo) e recorta a
  zona exata de uma sobreposição ou da parte que sai pela parede
  (Sutherland–Hodgman).
- **Circulação (Fase 6):** ver secção 13. Avisos, distintos dos erros, e
  orientações, não garantias de conformidade legal.

## 5. Modelo de dados (esquema v1)

```js
{
  schemaVersion: 1,
  id: 'project_…', name: 'Sala da Ana',
  createdAt: '2026-10-23T18:00:00.000Z', updatedAt: '…',
  room: {
    type: 'living',            // ROOM_TYPES
    width: 5, depth: 4,        // m, interior
    wallHeight: 2.7, wallThickness: 0.15,
    wallColor: '#f2f0eb', floorMaterial: 'oak', floorColor: '#c9a77c',
  },
  layouts: [                   // disposições alternativas para comparar
    {
      id: 'layout_…', name: 'Disposição 1', createdAt: '…',
      items: [{
        id: 'item_…', catalogId: 'sofa-3', name: 'Sofá de 3 lugares', category: 'sofas',
        position: { x: 2.5, z: 1 }, rotation: 0, elevation: 0,
        dimensions: { width: 2.2, depth: 0.9, height: 0.85 },
        color: '#8a8f94', finish: 'linen', locked: false,
      }],
    },
  ],
  activeLayoutId: 'layout_…',
  settings: { gridSize: 0.1, snapToGrid: true, rotationStep: 15, circulationMin: 0.9 },
}
```

- A divisão é partilhada por todas as disposições; cada disposição tem a sua
  lista de móveis. É isto que permite comparar soluções para o mesmo espaço.
- Os móveis guardam uma cópia das medidas e da cor: o projeto continua a abrir
  mesmo que o catálogo mude.
- **Versões e migrações:** `MIGRATIONS[n]` converte da versão `n` para `n+1`.
  `migrateProject()` aplica a cadeia e recusa projetos de versões futuras com
  uma mensagem clara.
- **Leitura segura:** `parseProject(texto)` faz JSON → migração → validação e
  nunca lança exceções. Devolve `{ ok: true, project }` ou
  `{ ok: false, error: { code, message, details } }` com mensagens em
  português e o caminho de cada campo inválido. Um projeto corrompido no
  LocalStorage mostra um erro e não bloqueia a aplicação.
- **Ficheiro exportado:** `{ format: 'spaceshift.project', exportedAt, project }`.

O catálogo (Fase 4) segue o contrato `CatalogEntry` em `core/model/types.js`:
id, nome, categoria, medidas, limites de redimensionamento (ou `null` se
fixas), cor, acabamentos, preço indicativo opcional, chave do desenho 2D e
chave do modelo 3D.

## 6. Estrutura de pastas

```
spaceshift/
├── index.html
├── package.json
├── vite.config.js              # Vite + Vitest, alias @ → src
├── jsconfig.json               # alias @ para o editor
├── .oxlintrc.json
├── docs/
│   └── ARCHITECTURE.md
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx                # ponto de entrada (carrega Inter e estilos) ✓
    ├── app/
    │   ├── App.jsx             # raiz: lista de projetos ou editor, pela rota ✓ Fase 7
    │   ├── router.js           # rotas por hash (#/ e #/projeto/<id>)        ✓ Fase 7
    │   └── Toaster.jsx         # notificações breves                           ✓ Fase 7
    ├── pages/
    │   ├── ProjectsPage/       # ✓ Fase 7: lista, criar, duplicar, renomear, eliminar, importar
    │   └── EditorPage/         # ✓ Fase 2: EditorPage (composição), EditorTopBar,
    │                           #   EditorStatusBar, ProjectNameField
    │                           #   ✓ Fase 7: EditorRoute (abrir/erro), useEditorPersistence,
    │                           #   editorActions (voltar, exportar)
    ├── components/             # UI genérica, sem lógica de domínio      ✓ Fase 2
    │   ├── brand/Logo.jsx
    │   ├── ui/                 # Button, IconButton, Tooltip, NumberField, Select,
    │   │                       # Switch, SegmentedControl, ColorField, SearchField,
    │   │                       # EmptyState, PanelSection/FieldGrid
    │   │                       # ✓ Fase 7: Dialog, ConfirmDialog, Menu, TextField
    │   └── layout/             # AppShell (grelha responsiva), SidePanel
    ├── features/               # módulos com UI + lógica de uma área do produto
    │   ├── editor2d/           # ✓ Fases 2–3: PlanView, PlanItem, SelectionOverlay,
    │   │                       #   DropGhost, ZoomControls, useViewport,
    │   │                       #   usePlanPointer (gestos), planGeometry
    │   │                       #   symbols/PlanSymbol (16 desenhos de planta) ✓ Fase 4
    │   ├── catalog/            # ✓ CatalogPanel, CatalogCard (arrastar e +),
    │   │                       #   CatalogPreview (mesmo símbolo da planta), filterCatalog
    │   ├── inspector/          # ✓ PropertiesPanel, RoomInspector, ItemInspector,
    │   │                       #   FinishPicker (acabamento, cor, bloqueio, altura ao chão)
    │   ├── scene3d/            # ✓ SceneView (lazy, WebGL, erros), Scene3D, CameraRig,
    │   │                       #   Furniture3D, useItemDrag3D, models/ (peças e materiais),
    │   │                       #   room/ (paredes, corte, chão procedimental)
    │   ├── analysis/           # ✓ Fase 6: AnalysisPanel, IssueList, AnalysisLayer
    │   │                       #   (marcadores SVG), markerPaths
    │   ├── projects/           # ✓ Fase 7: ProjectCard, NewProjectDialog, NameDialog,
    │   │                       #   projectActions (fala com o repositório), useProjects
    │   ├── layouts/            # ✓ Fase 7: LayoutBar (disposições), ComparisonView, compareLayouts
    │   └── export/             # ✓ Fase 7: PlanSheet (folha SVG), exportImages (PNG planta e 3D)
    ├── core/                   # JS puro, sem React, 100% testável
    │   ├── units/units.js      # metros, mm, formatação pt-PT        ✓ Fase 1
    │   ├── coordinates/
    │   │   ├── viewport.js     # mundo ↔ ecrã, zoom, pan, enquadrar ✓ Fase 1
    │   │   └── sceneMapping.js # planta ↔ Three.js                  ✓ Fase 1
    │   ├── geometry/           # vec2, ângulos, polígonos, pegadas,
    │   │   │                   # colisões SAT, snap                   ✓ Fase 1
    │   │   ├── shapes.js       # ✓ Fase 6: formas reais (retângulo, elipse, L)
    │   │   └── distance.js     # ✓ Fase 6: distâncias, recortes, interseções
    │   ├── model/              # tipos, constantes, fábricas, métricas,
    │   │                       # validação, migrações, (de)serialização ✓ Fase 1
    │   │                       # sanitize.js (alterações seguras)      ✓ Fase 2
    │   │                       # itemOps.js (operações sobre móveis)   ✓ Fase 3
    │   ├── editing/            # ✓ Fase 3: mover/rodar/redimensionar (snap pela
    │   │                       #   aresta, pegas com aresta oposta fixa), espaço livre
    │   ├── analysis/           # ✓ Fase 6: analyzeLayout() → erros e avisos,
    │   │                       #   rules.js (limiares), circulation.js (grelha)
    │   ├── analysis/score.js   # ✓ Fase 7: pontuação de uma disposição e destaques
    │   └── history/            # ✓ Fase 7: anular/refazer com instantâneos e nomes
    ├── data/catalog/           # ✓ dados puros: furniture.js (22 móveis), finishes.js
    ├── data/examples/          # ✓ Fase 7: projeto de exemplo (sala com duas disposições)
    ├── store/                  # ✓ Zustand
    │   ├── projectStore.js     # documento + ações (divisão, definições, móveis)
    │   ├── editorStore.js      # estado efémero: vista, seleção, gesto em curso
    │   ├── commands.js         # ações do editor partilhadas por botões/atalhos/planta
    │   ├── autosave.js         # ✓ Fase 7: gravação automática + saveNow()
    │   ├── toastStore.js       # ✓ Fase 7: notificações
    │   └── selectors.js        # seletores, useDisplayedItems, computeLayoutMetrics
    ├── services/               # ✓ Fase 7: fronteira com o exterior
    │   ├── persistence/
    │   │   ├── ProjectRepository.js     # contrato (list, get, save, remove)
    │   │   ├── localStorageRepository.js
    │   │   └── index.js                 # getRepository(): trocar aqui por uma API
    │   └── export/             # download, ficheiro JSON, SVG → PNG
    ├── hooks/                  # ✓ useElementSize, useKeyboardShortcuts
    ├── utils/                  # ✓ time.js (datas relativas), fileName.js (slug)
    ├── styles/
    │   ├── tokens.css          # cores, tipografia, espaçamentos      ✓ Fase 1
    │   └── base.css            # reset e base                         ✓ Fase 1
    └── test/
        ├── setup.js            # jest-dom + limpeza                   ✓ Fase 1
        └── dependencies.test.js # confirma que as dependências resolvem ✓ Fase 1
```

Os testes ficam ao lado do código que testam (`*.test.js`).

## 7. Fluxo de dados (alvo)

```
 CatalogPanel ─┐                                         ┌─ PlanCanvas (SVG)
 Inspector ────┼─► ações do store ─► projeto (Zustand) ──┼─ Scene3D (R3F)
 Atalhos ──────┘        │                 │              ├─ StatusBar
                        ▼                 ▼              └─ AnalysisPanel
                    histórico       analyzeLayout() (memoizado)
                                          │
                                 repositório (LocalStorage → API)
```

## 8. Preparação para backend

- `services/persistence/ProjectRepository.js` define métodos assíncronos
  (`list`, `get`, `save`, `remove`) mesmo para LocalStorage, para que trocar
  para `fetch()` não mude quem os chama.
- Os ids são strings opacas (`project_<uuid>`), compatíveis com uma base de dados.
- O esquema versionado e a validação podem ser reutilizados no servidor.

## 9. Interface (Fase 2)

- **Layout:** grelha CSS com barra superior, catálogo (esquerda), área
  central, propriedades (direita) e barra inferior. Abaixo de 900 px os três
  painéis passam a separadores (Catálogo / Planta / Propriedades) e só um é
  visível de cada vez.
- **Ações de fases seguintes** (Anular, Refazer, Guardar, Exportar, vista 3D)
  já estão no sítio final mas desativadas com `aria-disabled` e o motivo em
  tooltip e `aria-describedby`. Nenhum botão finge fazer algo que não faz.
- **Campos numéricos** confirmam com Enter/saída do campo, aceitam vírgula,
  ajustam com as setas e limitam aos valores válidos. Cada confirmação é uma
  única alteração, preparando o agrupamento do Undo/Redo.
- **Tipografia:** Inter Variable, servida localmente (`@fontsource-variable/inter`),
  sem pedidos a serviços externos.
- **Conflitos na barra inferior:** contagem real com a geometria da Fase 1
  (móveis fora da divisão e sobreposições SAT). Revestimentos de chão com
  altura ≤ 3 cm (tapetes) e objetos elevados não contam como sobreposição.
  A análise completa com circulação chega na Fase 6.

## 10. Editor 2D (Fase 3)

- **Gestos:** clicar seleciona; arrastar move (Alt desliga o snap); a pega
  circular roda (Shift = rotação livre ao grau); as pegas quadradas
  redimensionam mantendo fixa a aresta oposta, só nos eixos que o modelo
  permite. Arrastar o fundo, o botão do meio ou Espaço + arrastar desloca a
  vista; a roda do rato ou a pinça no trackpad fazem zoom no cursor.
- **Uma alteração por gesto:** durante o arrasto só muda `editorStore.interaction.preview`.
  O documento é atualizado uma vez, ao largar, por isso o Undo/Redo da
  Fase 7 guarda um passo por gesto e não um por movimento do rato.
  `useDisplayedItems()` junta a pré-visualização aos móveis, para a planta,
  a barra inferior e (na Fase 5) a cena 3D mostrarem o mesmo estado.
- **Snap pela aresta:** o snap alinha a caixa envolvente do móvel à grelha,
  não o centro, para os móveis encostarem às linhas e às paredes.
- **Adicionar:** arrastar o cartão para a planta coloca o móvel no ponto
  largado; o botão + procura o espaço livre mais próximo do centro, dentro
  da divisão e sem sobreposições.
- **Atalhos** (ignorados enquanto se escreve num campo): setas (passo da
  grelha, Shift ×10), R / Shift+R, Delete, Ctrl/⌘+D, Escape, + / − / 0, G.
- **Desempenho:** com 60 móveis, cada evento de arrasto foi processado em
  cerca de 17 ms no Chromium headless, incluindo o tempo do Playwright.

## 11. Catálogo e símbolos (Fase 4)

- **Símbolos de planta:** 16 desenhos (sofá, sofá de canto, cama, mesa,
  mesa redonda, secretária, móvel com portas, roupeiro, estante, cadeira,
  poltrona, cadeira de escritório, candeeiro de pé, candeeiro suspenso,
  tapete e planta). Cada símbolo é desenhado no referencial local do móvel
  (trás = −Z, frente = +Z), por isso roda e redimensiona sem se deformar.
  Detalhes que dependem da medida real (almofadas, portas, módulos) usam o
  comprimento em metros. Objetos suspensos são tracejados, como numa planta.
- **Pré-visualização no catálogo:** o mesmo componente, com proporções
  reais e escala limitada para objetos pequenos não parecerem enormes.
- **Acabamentos:** cada modelo lista os acabamentos que admite; escolher um
  aplica a cor sugerida. Também é possível escolher qualquer cor.
- **Bloquear (L):** impede mover, rodar, redimensionar, mudar acabamento e
  eliminar, seja com o rato, o teclado ou o painel. Duplicar continua
  possível e a cópia fica desbloqueada.
- **Limitação conhecida:** as colisões usam o retângulo envolvente de cada
  móvel. Para a mesa redonda e o sofá de canto isto é conservador (pode
  assinalar um conflito num canto vazio). Uma forma exata por tipo pode ser
  adicionada na Fase 6 sem mudar o modelo de dados.

## 12. Vista 3D (Fase 5)

- **Mesmo estado, duas vistas:** a cena lê `useDisplayedItems`, tal como a
  planta e a barra inferior. Um gesto em qualquer vista escreve só
  `editorStore.interaction.preview`; o documento muda uma vez, ao largar.
  Por isso a outra vista acompanha o gesto em tempo real e o futuro
  histórico (Fase 7) recebe um único passo por gesto.
- **Modelos procedimentais:** `models/furnitureModels.js` descreve cada
  móvel como uma lista de peças (caixa, caixa arredondada, cilindro, cone,
  esfera) em função das medidas. É puro e testado: todas as peças cabem nas
  medidas do móvel, assentam no chão e continuam coerentes nos limites de
  redimensionamento. `FurnitureModel` converte as peças em meshes com
  geometrias unitárias escaladas. Sem ficheiros nem URLs externos.
- **Materiais:** `models/materials.js` escolhe rugosidade/metalicidade pelo
  acabamento (linho, veludo, pele, carvalho, latão, vidro…) e pelo papel da
  peça (estrutura, almofada, metal, abajur…).
- **Divisão:** `room/roomGeometry.js` (puro) gera as paredes por fora do
  retângulo interior e decide o corte automático: uma parede baixa para
  rodapé quando a câmara está do lado de fora do seu plano. O chão usa uma
  textura desenhada num canvas local (`room/floorPattern.js`: tábuas,
  mosaico, microcimento ou alcatifa, com gerador pseudo-aleatório fixo).
- **Luz:** luz hemisférica, luz direcional com sombras, sombras de contacto
  e um `Environment` feito só de `Lightformer` (reflexos sem mapas HDR).
- **Câmara:** `OrbitControls` com amortecimento e limite para não passar
  abaixo do chão; vistas rápidas Perspetiva, Vista de cima, Frontal e
  Enquadrar com transição curta (`CameraRig`).
- **Arrasto no 3D:** `useItemDrag3D` captura o ponteiro, interseta o raio
  com o plano horizontal à altura do ponto agarrado e usa o mesmo
  `moveItem` (com snap) da planta. Os controlos da câmara ficam desligados
  durante o gesto. Móveis bloqueados selecionam-se mas não se movem.
- **Desempenho:** `frameloop="demand"` (só desenha quando algo muda) e
  carregamento diferido: o Three.js (~1 MB) é um chunk à parte que só é
  descarregado ao abrir a vista 3D; o editor 2D inicial fica em ~300 kB.
- **Robustez:** sem WebGL aparece uma explicação e um botão para voltar à
  planta; um erro na cena fica isolado (`SceneErrorBoundary`) com opção de
  tentar novamente, sem afetar o projeto.
- **Testes:** funções puras (paredes, corte, câmara, raio-chão, padrões do
  chão) e grafo de cena com `@react-three/test-renderer` (meshes por peça,
  posição/rotação, seleção/conflito, cabo do candeeiro, arrasto com
  pré-visualização e gravação ao largar, corte de paredes por frame).

## 13. Colisões e circulação (Fase 6)

- **Uma análise, todas as vistas:** `core/analysis/analyzeLayout(room, items,
  settings, { getProfile })` é pura e devolve `{ issues, errors, warnings,
  itemStatus, circulation }`. Cada problema tem tipo, gravidade, título,
  mensagem, sugestão, móveis envolvidos e um marcador em metros (`region`,
  `gap` ou `zone`). `store/selectors.getLayoutAnalysis` memoriza o último
  resultado ao nível do módulo e `useDisplayedItems` devolve a mesma lista
  a todas as vistas, por isso a análise corre uma vez por alteração, também
  durante um arrasto (4–7 ms com 12–40 móveis).
- **Perfil de cada móvel:** o núcleo não conhece o catálogo. O catálogo dá
  `footprint` (forma), `role` (seat, coffee-table, chair, table, bed,
  nightstand) e `usage` (seat, bed, wardrobe, drawers, desk) e o store passa `getItemProfile` à análise.
- **Erros (geometria impossível):**
  - fora da divisão: quanto sai por cada parede e a zona exata que sai; se
    o móvel não cabe de todo, diz a medida e sugere rodar 90° quando assim
    cabe; senão propõe «Trazer para dentro» (deslocação mínima);
  - sobreposição: forma real **e altura** (um candeeiro suspenso passa por
    cima da mesa mas não do roupeiro); tapetes nunca colidem; cadeiras podem
    entrar até 30 cm debaixo de mesas;
  - mais alto do que o teto (altura ao chão + altura > pé-direito).
- **Avisos (circulação):**
  - passagem estreita: folga exata entre móveis e entre móvel e parede,
    entre 10 cm (abaixo disso estão encostados) e a passagem mínima. Não
    contam pares usados em conjunto (sofá e mesa de centro, cadeira e mesa,
    cama e mesa de cabeceira), recantos sem saída (dois móveis encostados à
    mesma parede, ou um móvel encostado a uma parede perpendicular), folgas
    ocupadas por outro móvel, nem candeeiros e plantas;
  - zona de uso ocupada (`usage.js`): espaço livre à frente ou dos lados
    que o móvel precisa para ser usado, medido até ao primeiro obstáculo ou
    parede: sofás e poltronas 45 cm à frente, camas 60 cm de cada lado (numa
    cama de solteiro basta um lado), roupeiro 70 cm, cómoda 60 cm,
    secretária 75 cm para a cadeira. Móveis usados em conjunto não contam
    (mesa de cabeceira, mesa de centro, cadeira da secretária) e um móvel
    sobreposto já é um erro, por isso não se repete aqui;
  - sem acesso: nenhuma zona livre de 60 cm (ou a passagem mínima, se for
    menor) chega ao móvel; cadeiras e decoração ficam de fora;
  - zona isolada: pelo menos 1 m² livre que não se liga ao resto com 60 cm;
  - sem espaço para circular.
- **Grelha de circulação:** células de 5 cm (maiores em divisões enormes,
  até 40 000 células). Os móveis são rasterizados linha a linha e uma
  transformada de distância euclidiana exata (Felzenszwalb–Huttenlocher)
  dá a folga de cada célula; as paredes usam a distância exata. As zonas
  ligadas dão o acesso e as zonas isoladas; a zona com a passagem mínima
  é a que a planta mostra (botão de pegadas ou tecla C).
- **Na interface:** a barra inferior mostra erros e avisos e abre o painel
  de análise (coluna à direita da área central em ecrãs largos, cartão
  flutuante em ecrãs médios, por baixo da vista no telemóvel; a planta
  reenquadra-se para nada ficar tapado). O painel tem a passagem mínima editável, zona de circulação, listas
  listas separadas de erros e avisos e a nota de que não é conformidade legal.
  Clicar num problema seleciona o móvel e realça o marcador; os outros
  esbatem. Na planta os erros veem-se sempre (tracejado vermelho na zona
  exata); as cotas âmbar das passagens aparecem com o painel aberto ou para
  o móvel selecionado, por isso surgem e mudam em tempo real durante um
  arrasto. O contorno de cada móvel segue a forma real. O painel de
  propriedades lista os problemas do móvel selecionado. Na cena 3D o chão
  mostra as mesmas zonas e cotas, e o móvel em erro fica com contorno e
  pegada vermelhos.

## 14. Plano alargado (aprovado em 24/10/2026)

Ideias para diferenciar o SpaceShift, centradas em «cabe?» e «consigo passar?»:

- **Fase 7** (além de projetos, desfazer/refazer, guardar e exportar):
  comparação de disposições lado a lado com pontuação (área livre,
  circulação, avisos, custo total).
- **Fase 8:** como estava planeada.
- **Fase 9, nova:**
  - portas e janelas nas paredes, com o arco de abertura nas colisões;
  - «Passa pela porta?»: verificar se um móvel chega à divisão pela
    entrada, corredor e escada (inclinado ou na diagonal);
  - percurso a pé entre dois pontos, com o ponto mais estreito assinalado;
  - modo acessibilidade (cadeira de rodas com círculo de 150 cm, carrinho
    de bebé), com limites próprios;
  - criar um móvel colando as medidas de um produto de qualquer loja.
- **Com backend (depois):** link só de leitura para partilhar uma disposição.

## 15. Projetos, histórico, gravação, exportação e comparação (Fase 7)

- **Rotas:** `#/` mostra a lista de projetos e `#/projeto/<id>` o editor.
  Funciona em qualquer alojamento estático; recarregar reabre o mesmo
  projeto e o botão Recuar volta à lista.
- **Repositório:** o editor e a lista só falam com `getRepository()`
  (contrato assíncrono `list/get/save/remove`). A implementação em
  LocalStorage guarda cada projeto numa chave e um índice com resumos
  (nome, medidas, contagens e os móveis da disposição ativa para a
  miniatura), por isso a lista abre sem ler os projetos. Se o índice se
  corromper é reconstruído; um projeto ilegível aparece como «danificado»
  e pode ser eliminado; sem espaço há um erro explicado; sem LocalStorage
  (modo privado) funciona em memória e a lista avisa. Para ligar um
  backend basta outra implementação do mesmo contrato.
- **Página de projetos:** criar (nome, tipo de divisão com medidas
  habituais, medidas exatas, pré-visualização das proporções), abrir,
  mudar o nome, duplicar («Sala (cópia)»), exportar JSON, importar
  (um ficheiro com um id que já existe entra como cópia, nunca substitui),
  eliminar com confirmação, procurar sem acentos e ordenar. Sem projetos,
  propõe criar um ou abrir o exemplo.
- **Anular/refazer:** `core/history` guarda instantâneos do documento
  (imutável, por isso é barato) com o nome de cada alteração («Mover
  Sofá de 3 lugares»), até 100 passos. Cada ação do store regista um
  passo; os gestos na planta e no 3D só alteram o documento ao largar,
  por isso um arrasto inteiro é um passo. O seletor de cor nativo junta-se
  num passo (mesma chave em menos de 1 s). Trocar de disposição não é um
  passo. Ctrl+Z, Ctrl+Shift+Z e Ctrl+Y; dentro de um campo de texto ficam
  com o browser. Não se anula a meio de um gesto.
- **Gravação:** automática 0,8 s depois da última alteração (várias
  alterações dão uma escrita), já com Guardar ou Ctrl+S, ao voltar à lista
  e quando a página é escondida ou fechada. O indicador mostra «Guardado
  às 12:41», «Alterações por guardar», «A guardar…» ou «Erro ao guardar».
  Há alterações por guardar quando o projeto atual não é o objeto gravado,
  por isso anular até ao estado gravado volta a «Guardado».
- **Exportar:** planta em PNG (folha 3200 × 2000 px com cotas, escala,
  resumo, lista de móveis e zonas de erro; SVG autónomo com a Inter
  embutida), vista 3D em PNG (fotograma da cena tal como está, quando a
  vista 3D está aberta) e projeto completo em JSON. O módulo de imagens é
  carregado só quando se exporta.
- **Disposições:** separadores por cima da vista; nova disposição a partir
  da atual (por omissão) ou vazia, mudar o nome, duplicar e eliminar com
  confirmação (anulável). Máximo de 12.
- **Comparação:** `core/analysis/score.js` dá a cada disposição 0–100:
  espaço livre (30, de 30 % a 65 % do chão livre), circulação (40, área
  onde se passa com a passagem mínima comparada com a divisão vazia,
  cheia a 60 %) e problemas (30, menos 6 por aviso e 15 por erro; com erros
  fica abaixo de 50). O custo total não entra: aparece ao lado. A vista
  mostra os cartões lado a lado com a planta (zona de circulação e erros),
  as parcelas, as métricas e destaques (melhor pontuação, mais espaço
  livre, melhor circulação, mais barata) só quando há um vencedor claro.
- **Correção:** a validação exigia 5 cm de altura a qualquer móvel e o
  tapete tem 1 cm, por isso um projeto com tapete não voltava a abrir. A
  altura passou a ter limite próprio (1 cm) e há um teste que guarda e
  reabre todos os móveis do catálogo.
