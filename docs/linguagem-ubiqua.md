# Linguagem ubíqua da LionsShop

Glossário montado a partir das regras de negócio do README original. O código usa os nomes da última coluna, para que negócio e desenvolvimento falem a mesma língua.

| Termo do negócio | O que é | Tipo | Nome no código |
| --- | --- | --- | --- |
| Produto | Item vendido no catálogo, com nome, preço e estoque | Entidade | `Product` (módulo `catalog`) |
| Preço / valor / total | Quantia em dinheiro | Objeto de valor | `Money` |
| Estoque | Quantidade disponível de um produto | Atributo da entidade | `Product.stock` |
| Ajuste de estoque (entrada/saída) | Somar ou subtrair do estoque | Comportamento | `Product.adjustStock()` |
| Cliente | Quem compra; tem nome e e-mail | Entidade | `Customer` (módulo `customers`) |
| E-mail | Contato único do cliente, sempre em minúsculas | Objeto de valor | `Email` |
| Cliente VIP | Cliente com 5% de desconto extra | Atributo da entidade | `Customer.vip` |
| Pedido | Compra feita por um cliente | Entidade (raiz do agregado) | `Order` (módulo `orders`) |
| Item do pedido | Produto, preço da época e quantidade dentro do pedido | Objeto de valor | `OrderItem` |
| Subtotal | Soma dos itens sem desconto | Cálculo | `Order.subtotal()`, `OrderItem.subtotal()` |
| Total | Valor cobrado, já com descontos | Cálculo | `Order.total()` |
| Status do pedido | Pendente, enviado ou cancelado | Enumeração | `OrderStatus.PENDING/SHIPPED/CANCELED` |
| Enviar pedido | Pedido sai para entrega | Comportamento | `Order.ship()` |
| Cancelar pedido | Desistir de um pedido pendente | Comportamento | `Order.cancel()` |
| Cupom | Código de desconto com percentual e validade | Entidade | `Coupon` (módulo `coupons`) |
| Validade do cupom | Até quando o cupom pode ser usado | Atributo | `Coupon.expiresAt` |
| Usar cupom | Cliente aplica o cupom em um pedido | Comportamento | `Coupon.redeem()` |
| Desconto | Cupom primeiro, depois VIP | Serviço de domínio | `DiscountService.calculate()` |
| Faturamento | Pedidos válidos e quanto a loja recebeu | Consulta | `GetRevenueReportUseCase` |
| E-mail de confirmação / envio / cancelamento | Aviso ao cliente | Porta de saída | `Mailer` |

## Regras do domínio

1. O estoque nunca pode ficar negativo.
2. O e-mail do cliente é único (e válido, em minúsculas).
3. Um pedido precisa de pelo menos um item; cada item precisa de quantidade maior que zero e de estoque disponível.
4. O cupom dá o percentual cadastrado; clientes VIP ganham mais 5%, aplicados depois do cupom.
5. Ao criar um pedido o estoque é reduzido e o cliente recebe e-mail.
6. Todo pedido nasce pendente. Só pedidos pendentes podem ser enviados ou cancelados.
7. Ao cancelar, os itens voltam ao estoque e o cliente recebe e-mail.
8. Um cupom só pode ser usado dentro da validade e uma vez por cliente.
9. O faturamento considera só pedidos não cancelados.

## Contextos delimitados

- **catalog**: produto como coisa vendável (nome, preço, estoque).
- **customers**: cadastro de clientes.
- **coupons**: promoções e regras de uso dos cupons.
- **orders**: o ciclo de vida do pedido e o faturamento.

Repare que "produto" aparece em dois contextos com formas diferentes: no catálogo é a entidade `Product` (com estoque que muda); dentro do pedido é o `OrderItem`, que congela nome e preço do momento da compra.
