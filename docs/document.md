Documentação Técnica Detalhada: Sistema Atletas em Foco
1. Visão Geral e Arquitetura
O sistema Atletas em Foco é uma aplicação de gerenciamento de mensalidades construída sobre uma arquitetura client-server. A aplicação tem como principal objetivo automatizar a gestão de assinaturas, fornecendo painéis distintos para o administrador e para o usuário final. Usuário e senha é: admin 1234.

Densenvolvedores: Davi Nascimento (Dev-backend), Gustavo (Dev-Backend), Ivan Magalhães (Dev-Fronend)

Backend: Implementado em Node.js com o framework Express.js, o servidor atua como uma API REST. Ele é responsável por gerenciar a lógica de negócio, a segurança e a persistência de dados.

Frontend: A interface é desenvolvida com HTML, CSS e JavaScript puro, garantindo um carregamento rápido e uma experiência fluida. O design é responsivo e adaptável a diferentes tamanhos de tela.

Banco de Dados: Utiliza SQLite, um sistema de banco de dados leve e sem servidor, ideal para a gestão local e prototipagem.

2. Como Rodar o Sistema
Para que o sistema funcione corretamente, siga estes passos:

Instale as dependências do Node.js:
Abra o terminal na pasta raiz do seu projeto e execute o comando para instalar todas as bibliotecas necessárias.

Bash

npm install express cors body-parser express-session sqlite3 uuid
Inicie o servidor:
No mesmo terminal, execute o comando abaixo. O servidor será iniciado na porta 3000.

Bash

node server.js
O terminal exibirá a mensagem "Servidor rodando na porta 3000".

Acesse a aplicação:
Abra o seu navegador e vá para o endereço http://localhost:3000. Não abra o arquivo HTML diretamente, pois a comunicação com a API será bloqueada.

3. Análise Detalhada do Código
Backend: server.js
O servidor é o coração da sua aplicação, e as suas rotas e middlewares são a sua principal funcionalidade.

Autenticação e Sessão:

Middleware isAuthenticated: Esta função atua como um portão de segurança. Ela é executada antes de cada rota de administração. Se a req.session.isAuthenticated for true, o acesso é liberado; caso contrário, a requisição é bloqueada com um erro 401 Unauthorized.

Rotas de Autenticação:

POST /login: Recebe nome de usuário e senha. Se as credenciais estiverem corretas, ele define req.session.isAuthenticated = true; e envia uma resposta de sucesso (200 OK).

POST /logout: Destrói a sessão do usuário com req.session.destroy(), encerrando a autenticação.

Rotas da API:

GET /users: Retorna uma lista de todos os usuários cadastrados no banco de dados.

POST /users: Adiciona um novo usuário na tabela users com um access_link único, gerado pela biblioteca uuidv4.

DELETE /users/:id: Exclui um usuário e todos os seus pagamentos relacionados da base de dados.

GET /user-by-link/:access_link: Rota pública, não protegida, usada pela página do usuário para buscar seus dados e histórico de pagamentos.

POST /payments (com validação): Esta rota possui uma regra de negócio crucial. Antes de registrar um pagamento, ela executa uma consulta SQL para verificar se o user_id já possui um pagamento no mês e ano atuais.

SQL

SELECT COUNT(*) AS count FROM payments WHERE user_id = ? AND strftime('%Y-%m', date) = strftime('%Y-%m', ?);
Se a contagem for maior que zero, o servidor retorna um erro 400 Bad Request com a mensagem Usuário já efetuou o pagamento no mês atual.. Caso contrário, o pagamento é registrado com sucesso.

Banco de Dados: O db.serialize() garante que as tabelas (users, payments, monthly_results) sejam criadas na inicialização do servidor, assegurando que a base de dados esteja sempre pronta para uso.

Frontend: admin.js e user.js
Os arquivos JavaScript controlam o comportamento da interface.

Autenticação:

loginForm.addEventListener: Impede o recarregamento da página com e.preventDefault() e envia as credenciais para POST /login no servidor.

checkLoginStatus: É a primeira função a ser executada. Ela tenta acessar uma rota protegida (GET /users). Se o servidor retornar 200 OK, o painel é carregado. Se retornar 401 Unauthorized, a função logout() é chamada, exibindo a tela de login.

Renderização Dinâmica:

renderAll(): Atua como uma orquestradora. Ela é chamada após cada ação do administrador e na inicialização. Sua responsabilidade é buscar todos os dados atualizados do servidor e repassá-los para as funções de renderização de cada elemento da página (renderUsers, renderHistory, updateSummaryDisplay).

Cards Interativos (Admin):

O código adiciona um eventListener aos botões de "Ver Detalhes".

Ele usa a classe .expanded para expandir o card clicado.

Ele usa a classe .has-expanded-card no contêiner principal para encolher e diminuir a opacidade dos outros cards, focando no que está aberto.

Página do Usuário:

O user.js busca os dados do usuário a partir do access_link na URL e atualiza o DOM para exibir o status e o histórico de pagamentos.

Processo de Pagamento:

O usuário vai adentrar no link unico gerado a partir do cadastro feito pelo admin, depois para o a card (Efetuar Pagamento), copiar a chave pix do admin e quando o mesmo efetuar o pagamento ele irar no link que tem abaixo da chave pix que o redirecionará ao número de WhatsApp pessoal do admin, e lá ele vai anexar o comprovante do pagamento. Após o admin confirma o comprovante, ele vai entrar na página de admin e vai até o card (Registrar Pagamento), vai selecionar o usúario que fez o envio do comprovante, colocarar o valor da mensalidade junto do comprovante que o usuario enviou via WhatsApp e irar confirmar o pagameno. Diante disso, o sistema atualizará os staus de ambas as telas, tanto a do admin quando a do usuario para pago.  

4. Gestão de Erros
Backend: O servidor retorna códigos de status HTTP claros (200 para sucesso, 401 para não autorizado, 400 para erro de requisição e 500 para erro interno), e envia mensagens de erro em formato JSON, que são fáceis de serem lidas pelo front-end.

Frontend: Todas as chamadas fetch são encapsuladas em blocos try...catch e verificam o res.ok. Se uma requisição falha, a mensagem de erro é exibida em um alert, informando o usuário sobre o problema.


5. Próximas Melhorias (Roteiro)
Pagamento Automatizado com API de Pix: A sua solução manual é temporária. O próximo passo ideal é integrar o sistema com uma API de pagamento (como o Asaas) para automatizar o processo.

Segurança Reforçada: Para um ambiente de produção, é crucial usar senhas mais seguras do que admin e 1234 e considerar o uso de variáveis de ambiente para armazenar chaves secretas.