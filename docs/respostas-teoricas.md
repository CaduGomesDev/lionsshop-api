# Questões teóricas e exercícios conceituais

Respostas às questões teóricas da ementa e aos exercícios que pedem análise em texto. Os exercícios de código estão implementados no projeto. A tabela no fim indica onde está cada um.

## Pergunta 1: Entidade x objeto de valor

Uma **entidade** tem identidade própria, que continua a mesma mesmo quando seus atributos mudam. Dois pedidos com os mesmos itens e o mesmo total continuam sendo pedidos diferentes, porque têm ids diferentes, e um pedido que muda de "pendente" para "enviado" continua sendo o mesmo pedido. Exemplo no projeto: `Order`, `Product`, `Customer`.

Um **objeto de valor** não tem identidade: é definido só pelos seus atributos, é imutável e é comparado pelo valor. Duas instâncias de `Money` de R$ 10,00 são intercambiáveis; para "mudar" o valor, cria-se outra instância. Exemplo no projeto: `Money` e `Email` (`Email.create('A@B.com').equals(Email.create('a@b.com'))` é `true`).

## Pergunta 2: Por que o domínio não deve depender de Express ou do driver do MongoDB?

Porque as regras de negócio mudam por motivos de negócio, e o framework e o banco mudam por motivos técnicos. Se a entidade `Order` importasse o Express ou o MongoDB:

- não daria para testar a regra "pedido enviado não pode ser cancelado" sem subir servidor ou banco;
- trocar de banco, ou atualizar o driver (como a versão 7 do driver, que mudou detalhes internos), obrigaria a mexer em código de regra de negócio;
- a regra ficaria presa a um único meio de entrada (HTTP), quando poderia ser chamada também por uma fila, um CLI ou um job.

O domínio é a parte mais estável e mais valiosa; ele deve ser o centro, e o resto deve depender dele, nunca o contrário.

## Pergunta 3: Interface do repositório no domínio, implementação na infra

O domínio diz **o que** precisa (`save`, `findById`, `findByCustomer`) na linguagem do negócio, sem citar coleções, `ObjectId` ou SQL. A infraestrutura decide **como** (`MongoOrderRepository`, `InMemoryOrderRepository`). Vantagens:

- **inversão de dependência:** a infra depende do domínio, e não o contrário;
- **troca de implementação sem mexer em regra:** no projeto, `REPOSITORY=memory` ou `mongo` só muda o `main.ts`;
- **testes rápidos:** os casos de uso são testados com o repositório em memória;
- o formato do banco não vaza para o domínio, porque o `OrderMapper` traduz os dois lados.

## Pergunta 4: Injeção de dependências e testes

Injeção de dependências é a classe **receber** o que precisa (normalmente pelo construtor), em vez de criar com `new`. O `CreateOrderUseCase` recebe `OrderRepository`, `ProductCatalog`, `CustomerDirectory`, `CouponGateway`, `DiscountService`, `Mailer` e `Clock`.

Nos testes isso permite passar versões falsas: `InMemoryOrderRepository` no lugar do Mongo, `FakeMailer` que só guarda as mensagens e `FixedClock` para controlar a data (testar cupom vencido sem esperar o tempo passar). O teste fica rápido, determinístico e focado na regra. Em produção, o `main.ts` (composition root) passa as implementações reais.

## Pergunta 5: Múltipla escolha

Corretas: **b** e **d**.

- a) Errada: controllers devem ser finos e só traduzir HTTP; regra de negócio no controller fica presa ao HTTP e se espalha.
- b) **Correta:** módulos por contexto de negócio deixam junto o que muda junto.
- c) Errada: criar dependências com `new` dentro do caso de uso acopla ao banco e impede testes isolados.
- d) **Correta:** o domínio contém só regras, sem detalhes de infraestrutura.

## Pergunta 6: O `CancelOrderUseCase` do colega

Princípios violados:

1. **Caso de uso acoplado ao HTTP:** recebe `req` e `res` do Express e responde status HTTP. Não dá para reutilizar fora de uma rota.
2. **Sem injeção de dependências:** faz `new MongoOrderRepository()` lá dentro, então não dá para testar sem MongoDB.
3. **Regra de negócio fora da entidade (modelo anêmico):** o caso de uso verifica o status e faz `order.status = 'CANCELED'`. Qualquer outro lugar pode alterar o status sem a regra.
4. **Regra incompleta:** só bloqueia `SHIPPED`; um pedido já cancelado poderia ser "cancelado" de novo, e não devolve estoque.
5. **Pedido inexistente não é tratado:** `order.status` quebraria com `null`.
6. **Devolve a entidade direto** na resposta HTTP.

Versão separada (é essencialmente o que está no projeto):

```ts
// domain/order.ts: a regra mora na entidade
export class Order {
  private status: OrderStatus;
  cancel(now: Date): void {
    if (this.status === OrderStatus.SHIPPED) throw new OrderAlreadyShippedError();
    if (this.status === OrderStatus.CANCELED) throw new OrderAlreadyCanceledError();
    this.status = OrderStatus.CANCELED;
    this.canceledAt = now;
  }
  getStatus() { return this.status; }
}

// application/use-cases/cancel-order.ts: orquestra, sem HTTP e sem banco concreto
export class CancelOrderUseCase {
  constructor(
    private readonly orders: OrderRepository, // interface do domínio
    private readonly catalog: ProductCatalog,
    private readonly clock: Clock,
  ) {}

  async execute(input: { orderId: string }): Promise<{ id: string; status: OrderStatus }> {
    const order = await this.orders.findById(input.orderId);
    if (!order) throw new OrderNotFoundError();
    order.cancel(this.clock.now());
    for (const item of order.items) await this.catalog.restock(item.productId, item.quantity);
    await this.orders.save(order);
    return { id: order.id, status: order.getStatus() }; // DTO, não a entidade
  }
}

// infra/http/order-controller.ts: só traduz HTTP <-> caso de uso
private cancel = async (req: Request<{ id: string }>, res: Response) => {
  res.json(await this.cancelOrder.execute({ orderId: req.params.id }));
};
// O error handler central mapeia: OrderNotFoundError -> 404, OrderAlreadyShippedError -> 409.
```

---

## Exercício 10: Identificando a camada

| Responsabilidade | Camada | Por quê / onde |
| --- | --- | --- |
| Validar se um e-mail é válido | Domínio | Regra do negócio, no objeto de valor `Email` |
| Ler `req.body` | Infraestrutura | Detalhe HTTP, no controller |
| Calcular o total de um pedido | Domínio | `Order.subtotal()`/`total()` e `DiscountService` |
| Salvar no MongoDB | Infraestrutura | `MongoOrderRepository` |
| Orquestrar a criação de um pedido | Aplicação | `CreateOrderUseCase` |
| Enviar e-mail pelo SendGrid | Infraestrutura | Implementação da porta `Mailer` (aqui, `ConsoleMailer`) |
| Impedir o cancelamento de um pedido enviado | Domínio | `Order.cancel()` |

## Exercício 11: Reorganizando pastas

Organização por tipo técnico:

```
src/controllers/  orderController, productController, customerController
src/services/     orderService, couponService ...
src/models/       order, product, customer
src/repositories/ orderRepository ...
```

Proposta por domínio:

```
src/modules/
  catalog/   domain/ application/ infra/ index.ts
  customers/ domain/ application/ infra/ index.ts
  coupons/   domain/ application/ infra/ index.ts
  orders/    domain/ application/ infra/ index.ts
src/shared/  (Money, DomainError, Mailer, Clock)
src/main.ts  (composition root)
```

Justificativa: uma mudança de negócio ("cupom com validade") mexe em um único lugar (`modules/coupons`), e não em quatro pastas técnicas. A pasta conta o que o sistema **faz**. Cada módulo pode ser entendido, testado e até extraído sozinho, e o `index.ts` deixa explícito o que é público. Dentro do módulo, a separação em camadas mantém o domínio independente da infra.

## Exercício 29: Contextos delimitados, "Produto" em dois contextos

```ts
// catalog: o que importa para vender
class Product { id; name; description; price: Money; }

// shipping: o que importa para entregar
class Parcel { productId; weightGrams: number; dimensions: { h; w; d }; fragile: boolean; }
```

Duas classes pequenas são melhores que uma classe gigante compartilhada porque cada contexto tem regras, vocabulário e ritmo de mudança próprios. Uma classe única acumularia campos que metade do sistema não usa, viraria ponto de acoplamento (mudar algo para o frete arrisca quebrar o catálogo) e confundiria o significado das palavras. O projeto já faz isso: o `OrderItem` não é o `Product` do catálogo; ele congela nome e preço do momento da compra, que é o que importa para o pedido. Os contextos se ligam só pelo id.

## Exercício 33: Identificando over-engineering

Para um CRUD simples de categorias (criar, listar, renomear), **não** vale criar entidade rica, objeto de valor, serviço de domínio, mapper, porta e adapter. Não há regra de negócio para proteger; seriam várias camadas só repassando dados. Uma escolha razoável:

- manter o módulo `categories` na mesma estrutura de pastas, por consistência;
- um caso de uso fino (ou um "service" de aplicação) chamando um repositório, com a validação mínima (nome obrigatório e único);
- sem `DiscountService`, eventos ou gateways.

Se aparecerem regras ("não renomear categoria com produtos ativos", hierarquia de categorias), aí sim a lógica migra para uma entidade. A arquitetura deve crescer com a complexidade do domínio, e não antes dela.

---

## Onde está cada exercício de código

| Exercício | Onde |
| --- | --- |
| 1: linguagem ubíqua | [`linguagem-ubiqua.md`](linguagem-ubiqua.md) |
| 2, 3, 6: `Order`, status privado, `cancel()`, `getStatus()`, `OrderItem`, `total()` | `src/modules/orders/domain/order.ts`, `order-item.ts` |
| 4: `Email` | `src/modules/customers/domain/email.ts` |
| 5: `Money` (centavos, imutável) | `src/shared/domain/money.ts`, `test/unit/shared/money.test.ts` |
| 7, 8: `OrderRepository` e `InMemoryOrderRepository` | `orders/domain/order-repository.ts`, `orders/infra/database/in-memory-order-repository.ts` |
| 9: `DiscountService` | `orders/domain/discount-service.ts` |
| 12: estrutura de módulo | `src/modules/*` |
| 13, 14, 15: `CreateOrderUseCase`, `CancelOrderUseCase`, DTOs | `orders/application/use-cases/`, `orders/application/dtos.ts` |
| 16, 17: controller fino e erros de domínio → 404/409/400 | `orders/infra/http/order-controller.ts`, `shared/domain/domain-error.ts`, `shared/infra/http/error-handler.ts` |
| 18, 19: `MongoOrderRepository` e `OrderMapper` | `orders/infra/database/` |
| 20, 21: composition root e `REPOSITORY=memory\|mongo` | `src/main.ts` |
| 22, 23: testes da entidade e dos casos de uso | `test/unit/`, `test/use-cases/` |
| 24: integração do repositório | `test/integration/mongo-order-repository.test.ts` |
| 25: supertest | `test/api/` |
| 26: `Mailer` injetado e `FakeMailer` | `shared/application/mailer.ts`, `test/support/fakes.ts` |
| 27, 28: módulo `catalog`, porta `ProductCatalog`, `index.ts` por módulo | `orders/application/ports.ts`, `orders/infra/gateways/`, `modules/*/index.ts` |
| 31: regra de dependência automatizada | `test/architecture.test.ts` |
| 32: refatorando código legado com testes antes | histórico do git + `test/api/characterization.test.ts` |
| 34: README da arquitetura | [`../README.md`](../README.md) |
| 35: projeto integrado | este repositório |
