# LionsShop API — refatorada com DDD

Entrega do PBL do módulo **Estruturando Projetos Node.js com DDD** (Lions TechSkills).

A API de pedidos da LionsShop começou como um protótipo com **tudo em um único arquivo** (`src/app.ts`): rotas, regras de negócio e acesso ao banco misturados, e nenhum teste. Este repositório mostra a refatoração para uma arquitetura orientada ao domínio, com módulos por contexto de negócio, camadas separadas, injeção de dependências, os três novos casos de uso e testes automatizados.

O histórico de commits conta a história na ordem certa:

1. `test: adiciona testes de caracterização da API legada`: antes de mover qualquer código, testes com supertest registraram o comportamento do `app.ts` original.
2. `refactor: reorganiza a API em módulos DDD`: a refatoração, com os mesmos testes passando na nova arquitetura.
3. `test: cobre entidades, casos de uso, API, repositório Mongo e arquitetura`.

---

## Como rodar

Pré-requisitos: **Node.js 20+** e **Docker** (ou uma conta gratuita no MongoDB Atlas).

```bash
npm install
cp .env.example .env
docker compose up -d     # sobe o MongoDB na porta 27017
npm run seed             # cria produtos, clientes e os cupons LIONS10 e BLACKFRIDAY
npm run dev              # API em http://localhost:3000
```

**Sem banco nenhum:** coloque `REPOSITORY=memory` no `.env` e rode só `npm run dev`. A API sobe com repositórios em memória (os dados somem ao reiniciar). Nenhum caso de uso muda; só o composition root escolhe outra implementação.

**Testes:** `npm test`. Não precisa de Docker: os testes que usam MongoDB sobem um banco em memória com `mongodb-memory-server` (o primeiro run baixa o binário do mongod 7.0).

O arquivo `requests.http` tem exemplos de todas as rotas (extensão REST Client do VS Code).

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe a API com recarga automática (`src/main.ts`) |
| `npm run build` | Compila o TypeScript para `dist/` |
| `npm start` | Roda a versão compilada |
| `npm run seed` | Limpa o banco e cria dados de exemplo |
| `npm test` | Roda todos os testes com Jest |

---

## Arquitetura

### Estrutura de pastas

O código é organizado **por contexto de negócio** (`src/modules/<contexto>`), e dentro de cada módulo **por camada**.

```
src/
├── main.ts                  # composition root: monta tudo e sobe o servidor
├── seed.ts
├── shared/                  # núcleo compartilhado (bem pequeno de propósito)
│   ├── domain/              # DomainError, Money
│   ├── application/         # portas Mailer e Clock
│   └── infra/               # ConsoleMailer, SystemClock, error handler HTTP, helpers do Mongo
└── modules/
    ├── catalog/             # produtos e estoque
    ├── customers/           # clientes (Email como objeto de valor)
    ├── coupons/             # cupons cadastrados (validade, uso único por cliente)
    └── orders/              # pedidos: criar, enviar, cancelar, listar, faturamento
        ├── index.ts         # porta de entrada: o que outros módulos podem usar
        ├── domain/          # Order, OrderItem, OrderStatus, DiscountService,
        │                    # interface OrderRepository, erros de domínio
        ├── application/
        │   ├── ports.ts     # o que pedidos precisa de outros módulos
        │   ├── dtos.ts      # entrada/saída dos casos de uso
        │   └── use-cases/   # create, cancel, ship, get, list, list-customer-orders, revenue
        └── infra/
            ├── database/    # MongoOrderRepository, OrderMapper, InMemoryOrderRepository
            ├── gateways/    # adapters que implementam as portas usando os outros módulos
            └── http/        # OrderController (controller fino)
```

Os módulos `catalog`, `customers` e `coupons` seguem a mesma forma (`domain/`, `application/use-cases/`, `infra/database/`, `infra/http/`, `index.ts`).

### O papel de cada camada

| Camada | O que tem | Pode depender de |
| --- | --- | --- |
| **Domínio** (`domain/`) | Entidades, objetos de valor, serviços de domínio, interfaces de repositório e erros de negócio. É aqui que as regras moram. | Só de `shared/domain`. Nada de Express, MongoDB ou infra. |
| **Aplicação** (`application/`) | Casos de uso que orquestram o fluxo: buscam no repositório, chamam a entidade, salvam, mandam e-mail. DTOs e portas. | Domínio e portas. Recebe tudo **pelo construtor**. |
| **Infraestrutura** (`infra/`) | Detalhes técnicos: repositórios MongoDB e em memória, mappers, controllers HTTP e adapters entre módulos. | Tudo acima. |
| **Composition root** (`main.ts`) | Único lugar que faz `new` das implementações concretas e liga as peças. | Tudo. |

Essas regras são **verificadas automaticamente** em `test/architecture.test.ts`: se um arquivo de `domain/` importar `express`, `mongodb` ou algo de `infra/`, ou se um módulo importar o interior de outro módulo, o `npm test` falha.

### Como os módulos conversam

O módulo `orders` precisa saber preço e estoque (catalog), se o cliente é VIP (customers) e se o cupom vale (coupons). Ele **não importa o interior** desses módulos:

1. `orders/application/ports.ts` define o que pedidos precisa: `ProductCatalog`, `CustomerDirectory` e `CouponGateway`.
2. `orders/infra/gateways/*` implementa essas portas usando só o que cada módulo exporta no seu `index.ts`.
3. `main.ts` liga tudo.

Assim, nos testes, os casos de uso de pedidos rodam com fakes dessas portas, sem os outros módulos, sem banco e sem HTTP.

### Onde está cada regra de negócio

| Regra | Onde |
| --- | --- |
| O estoque nunca pode ficar negativo | `Product.adjustStock` |
| E-mail válido, em minúsculas e único | `Email` (objeto de valor) + `RegisterCustomerUseCase`/`UpdateCustomerUseCase` |
| Pedido tem pelo menos um item, quantidade > 0 | `Order.place`, `OrderItem.create` |
| Item precisa de estoque disponível | `CreateOrderUseCase` (soma linhas repetidas do mesmo produto) |
| Cupom aplicado primeiro, depois 5% VIP | `DiscountService` (serviço de domínio) |
| Pedido nasce pendente; só pendente pode ser enviado | `Order.place`, `Order.ship` |
| Só pendente pode ser cancelado; enviado não | `Order.cancel` |
| Cupom só dentro da validade, uma vez por cliente | `Coupon.assertRedeemableBy` / `Coupon.redeem` |
| Cancelados fora do faturamento | `Order.isBillable` + `GetRevenueReportUseCase` |
| Dinheiro sem erro de ponto flutuante | `Money` (guarda centavos) |

---

## Rotas

| Método | Rota | O que faz |
| --- | --- | --- |
| POST | `/products` | Cadastra um produto |
| GET | `/products?q=` | Lista produtos (busca opcional por nome) |
| PATCH | `/products/:id/stock` | Ajusta o estoque (+ entrada, − saída) |
| POST | `/customers` | Cadastra um cliente |
| GET | `/customers/:id` | Busca um cliente |
| PUT | `/customers/:id` | Atualiza nome e e-mail |
| **GET** | **`/customers/:id/orders`** | **Novo:** pedidos do cliente, mais recentes primeiro, com status e total |
| **POST** | **`/coupons`** | **Novo:** cadastra cupom (`code`, `discountPercent`, `expiresAt`) |
| **GET** | **`/coupons`** | **Novo:** lista os cupons |
| POST | `/orders` | Cria um pedido (`customerId`, `items`, `coupon` opcional) |
| GET | `/orders` | Lista todos os pedidos |
| GET | `/orders/:id` | Detalha um pedido (subtotal, desconto, total) |
| PATCH | `/orders/:id/ship` | Marca como enviado |
| **PATCH** | **`/orders/:id/cancel`** | **Novo:** cancela pedido pendente e devolve os itens ao estoque |
| GET | `/reports/revenue` | Faturamento dos pedidos não cancelados |

Erros sempre no formato `{ "error": "mensagem" }`: **400** dado inválido, **404** não encontrado, **409** conflito com o estado atual (ex.: cancelar pedido enviado, reusar cupom).

### Os três novos casos de uso

**1. Cancelar pedido**: `PATCH /orders/:id/cancel`. Só pedidos pendentes; enviado responde 409. Os itens voltam ao estoque, o cliente recebe e-mail e o pedido sai do faturamento.

**2. Aplicar cupom**: os cupons deixaram de ser fixos no código.
```http
POST /coupons
{ "code": "NATAL15", "discountPercent": 15, "expiresAt": "2026-12-25" }
```
Uma data sem horário vale até o fim daquele dia. No pedido, basta mandar `"coupon": "NATAL15"`. Fora da validade: 400. Mesmo cliente usando de novo: 409. O desconto VIP continua valendo depois do cupom.

**3. Listar pedidos do cliente**: `GET /customers/:id/orders`, do mais recente para o mais antigo, com `status` e `total` de cada pedido.

### Mudanças de comportamento em relação à versão original

Ficam registradas no diff dos testes de caracterização (`test/api/characterization.test.ts`):

- **Relatório de faturamento corrigido:** antes ele recalculava a partir dos itens e só conhecia o `LIONS10`, então ignorava `BLACKFRIDAY` e o desconto VIP. Agora soma o total realmente cobrado.
- **Enviar pedido que não está pendente** responde **409** (antes 400), como os demais conflitos de estado.
- **`POST /orders`** devolve `status: "PENDENTE"` (antes devolvia o número `1`).
- **`PUT /customers/:id`** salva o e-mail em minúsculas, impede e-mail de outro cliente e devolve o cliente atualizado (antes `{ ok: true }`).
- Mensagens de erro padronizadas na chave `error` (antes havia `erro` e `error`).
- Id inválido em qualquer rota responde 404 (antes derrubava a requisição com 500).
- Busca de produtos escapa caracteres especiais de regex.

---

## Testes

```
test/
├── unit/                  # entidades, objetos de valor e DiscountService (Arrange, Act, Assert)
├── use-cases/             # casos de uso com repositório em memória + fakes, sem banco e sem HTTP
├── api/
│   ├── characterization.test.ts  # comportamento herdado, com MongoDB real (em memória)
│   └── new-use-cases.test.ts     # os três novos casos de uso via HTTP
├── integration/           # MongoOrderRepository contra MongoDB real
├── architecture.test.ts   # regra de dependência entre camadas e módulos
└── support/               # FakeMailer, FixedClock e fakes das portas de pedidos
```

O relógio (`Clock`) e o envio de e-mail (`Mailer`) são injetados, então os testes controlam a data (validade de cupom, ordenação por data) e conferem os e-mails sem enviar nada.

> O script de teste roda o Jest com `--experimental-vm-modules`: o driver do MongoDB 7.9 carrega o módulo `os` via `import()` dinâmico, que só funciona dentro da VM do Jest com essa flag.

---

## Passo a passo: criando um novo caso de uso

Exemplo: "marcar pedido como entregue".

1. **Domínio**: a regra vai na entidade. Em `orders/domain/order.ts`, adicione o status `DELIVERED` e o método `deliver(now)`, que só aceita pedido `SHIPPED` (senão lança um erro de domínio novo em `domain/errors.ts`, estendendo `ConflictError`).
2. **Teste da entidade** em `test/unit/orders/order.test.ts`.
3. **Aplicação**: crie `orders/application/use-cases/deliver-order.ts`. Ele recebe `OrderRepository` (e o que mais precisar, como `Mailer` e `Clock`) **pelo construtor**, busca o pedido, chama `order.deliver(...)`, salva e devolve um DTO, nunca a entidade.
4. **Teste do caso de uso** com `InMemoryOrderRepository` e os fakes de `test/support`.
5. **Infra**: se o banco precisar mudar, ajuste o `OrderMapper` (ex.: status `4`). Adicione a rota no `OrderController` (só traduz HTTP ↔ caso de uso).
6. **Composition root**: em `main.ts`, faça o `new DeliverOrderUseCase(...)` e passe para o controller.
7. **Teste de API** com supertest em `test/api/`.

---

## Decisões e limites conhecidos

- **Sem transação entre módulos:** criar e cancelar pedido mexem em estoque, cupom e pedido em sequência. Todas as validações acontecem antes da primeira escrita, mas uma falha de banco no meio do caminho pode deixar dados inconsistentes. Em produção valeria usar transações do MongoDB (replica set) ou eventos com compensação.
- **Uso de cupom é definitivo:** cancelar um pedido não devolve o cupom ao cliente ("cada cliente pode usar o mesmo cupom apenas uma vez").
- **Compatível com os dados antigos:** os mappers mantêm o formato do banco original (status `1/2/3`, preços em reais), então um banco já populado pela versão antiga continua funcionando. Só os cupons passam a vir da coleção `coupons` (rode `npm run seed`).
- **Respostas teóricas e glossário:** veja a pasta [`docs/`](docs/).
