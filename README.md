# LionsShop API

Projeto base do PBL do módulo **Estruturando Projetos Node.js com DDD**.

A LionsShop é uma loja on-line de produtos para devs. A API de pedidos começou como um protótipo de fim de semana e foi crescendo sem planejamento: hoje **tudo está em um único arquivo, `src/app.ts`**, com rotas, regras de negócio e acesso ao banco misturados. Não há nenhum teste automatizado e ninguém tem coragem de mexer no código.

Ela funciona. O seu trabalho é deixá-la fácil de manter e de evoluir.

## Como rodar

Pré-requisitos: **Node.js 20+** e **Docker** (ou uma conta gratuita no MongoDB Atlas).

```bash
npm install
cp .env.example .env
docker compose up -d     # sobe o MongoDB na porta 27017
npm run seed             # cria produtos e clientes de exemplo e imprime os ids
npm run dev              # API em http://localhost:3000
```

Sem Docker: crie um cluster gratuito no [MongoDB Atlas](https://www.mongodb.com/atlas) e coloque a connection string em `MONGO_URL`, no arquivo `.env`.

O arquivo `requests.http` tem exemplos de todas as rotas. Ele pode ser executado direto do VS Code com a extensão REST Client.

## O que a API faz hoje

| Método | Rota | O que faz |
| --- | --- | --- |
| POST | `/products` | Cadastra um produto |
| GET | `/products?q=` | Lista produtos (com busca opcional por nome) |
| PATCH | `/products/:id/stock` | Ajusta o estoque de um produto |
| POST | `/customers` | Cadastra um cliente |
| GET | `/customers/:id` | Busca um cliente |
| PUT | `/customers/:id` | Atualiza nome e e-mail de um cliente |
| POST | `/orders` | Cria um pedido |
| GET | `/orders` | Lista todos os pedidos |
| GET | `/orders/:id` | Detalha um pedido |
| PATCH | `/orders/:id/ship` | Marca um pedido como enviado |
| GET | `/reports/revenue` | Relatório de faturamento |

## Regras de negócio atuais

É assim que o time de negócio descreve a loja. Use estas frases para montar a linguagem ubíqua do projeto.

- Um produto tem nome, preço e estoque. O estoque nunca pode ficar negativo.
- Um cliente tem nome e e-mail, e o e-mail é único. Alguns clientes são VIP.
- Um pedido precisa ter pelo menos um item, e cada item precisa de quantidade maior que zero e de estoque disponível.
- Existem dois cupons: `LIONS10` (10% de desconto) e `BLACKFRIDAY` (30% de desconto).
- Clientes VIP ganham mais 5% de desconto, aplicado depois do cupom.
- Ao criar um pedido, o estoque dos produtos é reduzido e o cliente recebe um e-mail de confirmação.
- Todo pedido nasce pendente. Só pedidos pendentes podem ser enviados, e o cliente recebe um e-mail quando o pedido sai para entrega.
- O relatório de faturamento mostra quantos pedidos válidos existem e quanto a loja faturou com eles.

## A missão

1. **Mapear:** identificar a linguagem ubíqua, as entidades e as regras do domínio.
2. **Reorganizar:** criar a estrutura de pastas por módulo de negócio (`src/modules/<contexto>`).
3. **Separar:** dividir o código em camadas de domínio, aplicação e infraestrutura, com injeção de dependências.
4. **Evoluir:** implementar os novos casos de uso, com testes.

> Dica: antes de mover qualquer código, escreva testes de integração com supertest que garantam o comportamento atual da API. Jest, ts-jest e supertest já estão instalados (`npm test`). Assim você refatora sem medo de quebrar o que funciona.

## Novos casos de uso

### 1. Cancelar pedido

`PATCH /orders/:id/cancel`

- Só pedidos pendentes podem ser cancelados. Um pedido enviado não pode ser cancelado.
- Os itens do pedido voltam para o estoque.
- O cliente recebe um e-mail avisando do cancelamento.
- Pedidos cancelados não entram no relatório de faturamento.

### 2. Aplicar cupom

Os cupons deixam de ficar fixos no código e passam a ser cadastrados.

- `POST /coupons` cadastra um cupom com código, percentual de desconto e data de validade.
- Um cupom só pode ser usado dentro da validade.
- Cada cliente pode usar o mesmo cupom apenas uma vez.
- A regra de desconto VIP continua valendo.

### 3. Listar pedidos do cliente

`GET /customers/:id/orders`

- Retorna os pedidos do cliente, do mais recente para o mais antigo, com o status e o total de cada um.

## Critérios de avaliação

| Critério | O que vamos observar |
| --- | --- |
| Separação de camadas | Domínio sem dependência de framework ou banco |
| Organização por módulo | Pastas refletem os contextos de negócio |
| Injeção de dependências | Casos de uso recebem dependências pelo construtor |
| Novos casos de uso | Cancelar pedido, aplicar cupom e listar pedidos funcionando |
| Testes | Casos de uso testados com Jest |
| README | Explica a estrutura e como rodar o projeto |

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe a API com recarga automática |
| `npm run build` | Compila o TypeScript para `dist/` |
| `npm start` | Roda a versão compilada |
| `npm run seed` | Limpa o banco e cria dados de exemplo |
| `npm test` | Roda os testes com Jest |
