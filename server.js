import express from 'express'
import { PrismaClient } from './generated/prisma/client.js'
//import { getNextId } from './couterServise.js';
import dotenv from "dotenv";

dotenv.config();

// cabeça
const app = express()
app.use(express.json()) //para usar a linguagem json

const prisma = new PrismaClient()



/* ===========================================================
   🔒 Middleware de Autenticação por Chave (x-api-key)
   =========================================================== */
function autenticar(req, res, next) {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
        return res.status(401).json({ error: "Chave de acesso ausente." });
    }

    if (apiKey === process.env.ADMIN_KEY) {
        req.userRole = "admin";
        return next();
    }

    if (apiKey === process.env.CLIENT_KEY) {
        if (req.method === "GET") {
            req.userRole = "client";
            return next();
        } else {
            return res.status(403).json({ error: "Acesso negado. Chave de leitura não pode modificar dados." });
        }
    }

    return res.status(401).json({ error: "Chave de acesso inválida." });
}

/* ===========================================================
   🧩 Aplicando o middleware
   =========================================================== */
// Todas as rotas exigem autenticação
app.use(autenticar);



/* 
https://www.youtube.com/watch?v=PyrMT0GA3sE
*/

//Banco de dados no MongoDB
/*
Banco: Arvoredo
Usuario: Thiago
Password: etecjau

npm install mongodb

mongodb+srv://thiago:etecjau@arvoredo.dkrq4wj.mongodb.net/?retryWrites=true&w=majority&appName=Arvoredo

*/

//Banco de dados no MongoDB da conta daigo
/*
Banco: Arvoredo
Usuario: daigo
Password: etecjau

npm install mongodb

mongodb+srv://thiago:etecjau@arvoredo.dkrq4wj.mongodb.net/?retryWrites=true&w=majority&appName=Arvoredo

*/

// node Server.js  é usado para rodar o arquivo 
// node --watch server.js é o mesmo que o anterior mas ele consegue se atualizar sozinho

// 🔹 Rotas de exemplo
app.get("/", (req, res) => {
    res.send("API rodando!");
});

async function getNextId(counterName) {
    const counter = await prisma.counter.upsert({
        where: { name: counterName },
        update: {
            value: { increment: 1 }
        },
        create: {
            name: counterName,
            value: 1
        }
    });

    return counter.value;
}

//#region Usuarios
/* 

Usuario

*/



//criar o usuarios em body
app.post('/usuarios', async (req, res) => {
    const { login, senha, nome, email, nivelAcesso } = req.body

    const repetido = await prisma.usuarios.findMany({
        where: {
            login
        }
    })

    if (repetido.length > 0) return res.json({ message: "email repetido" });

    // 🔸 Gera o ID para a venda principal
    const usuarioId = await getNextId('usuarios');

    await prisma.usuarios.create({
        data: {
            id: usuarioId,
            login,
            senha,
            nome,
            email,
            nivelAcesso
        } //vai pegar e enviar os dados para o banco de dados

    })

    res.status(201).send(req.body)  //usado para mandar a mensagem de status de que tudo ocorreu bem / 201 - eu fiz o que pediu
})

//consultar usuarios em querry
app.get('/usuarios', async (req, res) => {

    let usuarios = []

    if (Object.keys(req.query).length > 0) {
        const where = {}

        if (req.query.nome) where.nome = { contains: req.query.nome, mode: "insensitive" }
        if (req.query.senha) where.senha = req.query.senha
        if (req.query.nivelAcesso) where.nivelAcesso = req.query.nivelAcesso
        if (req.query.login) where.login = req.query.login
        if (req.query.email) where.email = { contains: req.query.email, mode: "insensitive" }

        usuarios = await prisma.usuarios.findMany({
            where
        })
    } else {
        usuarios = await prisma.usuarios.findMany()
    }
    res.status(200).json(usuarios) //200 -deu certo o retorno
})

//GET by id / usuarios
app.get('/usuarios/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id); //converte string em int
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

        const usuarios = await prisma.usuarios.findUnique({
            where: {
                id
            }
        })

        if (!usuarios) return res.status(400).json({ error: "Usuario não encontrado" })

        res.status(200).json(usuarios)

    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//editar usuarios em route paramiter
//ex: servidor.com/usuarios/22

app.put('/usuarios/:id', async (req, res) => {
    const id = parseInt(req.params.id); //converte string em int

    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const usuarios = await prisma.usuarios.findUnique({
        where: {
            id
        }
    })

    if (!usuarios) return res.status(400).json({ error: "Usuario não encontrado" })

    const { nome, login, senha, email, nivelAcesso } = req.body

    await prisma.usuarios.update({
        where: {
            id //vai pegar o id do usuario que eu quero editar, pelo link
        },
        data: {
            login,
            senha,
            nome,
            email,
            nivelAcesso
        } //vai pegar e enviar os dados para o banco de dados

    })

    res.status(201).send(req.body)  //usado para mandar a mensagem de status de que tudo ocorreu bem / 201 - eu fiz o que pediu
})

//deletar usuarios em route paramiter
//ex: servidor.com/usuarios/22
app.delete('/usuarios/:id', async (req, res) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(404).json({ error: "ID inválido" })

    const usuarios = await prisma.usuarios.findUnique({
        where: {
            id
        }
    })

    if (!usuarios) return res.status(400).json({ error: "Usuario não encontrado" })

    await prisma.usuarios.delete({
        where: {
            id: id //vai pegar o id do usuario que eu quero deletar, pelo link
        }
    })

    res.status(204).send() //204 - deu certo, mas não tem conteudo para retornar
})
//#endregion

//#region Fornecedores

/*
    Fornecedores
*/

// POST /fornecedores
app.post('/fornecedores', async (req, res) => {
    try {
        const {
            nome,
            cep,
            cidade,
            estado,
            bairro,
            rua,
            numero,
            descricao,
            produtos,
            madeiras,
            telefone,
            email
        } = req.body;

        const fornecedor = await prisma.fornecedores.create({
            data: {
                nome,
                cep,
                cidade,
                estado,
                bairro,
                rua,
                numero,
                telefone,
                email,
                descricao,
                // Produtos são opcionais
                ...(produtos && {
                    produtos: {
                        create: produtos
                    }
                }),
                // Madeiras são opcionais
                ...(madeiras && {
                    madeiras: {
                        create: madeiras
                    }
                })
            },
            include: {
                produtos: true,
                madeiras: true
            }
        });

        res.status(201).json(fornecedor);
    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
});

//GET / fornecedores
app.get("/fornecedores", async (req, res) => {
    try {
        let fornecedores = []

        if (Object.keys(req.query).length > 0) {
            const where = {}

            if (req.query.nome) where.nome = { contains: req.query.nome, mode: "insensitive" }
            if (req.query.cep) where.cep = req.query.cep
            if (req.query.estado) where.estado = req.query.estado
            if (req.query.cidade) where.cidade = req.query.cidade
            if (req.query.descricao) where.descricao = req.query.descricao

            fornecedores = await prisma.fornecedores.findMany({
                where,
                include: {
                    madeiras: true,
                    produtos: true
                }
            })

        } else {
            fornecedores = await prisma.fornecedores.findMany({
                include: {
                    madeiras: true,
                    produtos: true
                }
            })
        }

        res.status(200).json(fornecedores)

    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//GET by id /fornecedores
app.get('/fornecedores/:id', async (req, res) => {
    try {
        const { id } = req.params

        const fornecedor = await prisma.fornecedores.findUnique({
            where: {
                id
            }
        })

        if (!fornecedor) return res.status(400).json({ erro: "fornecedor não encontrado" })

        res.status(200).json(fornecedor)

    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//DELETE / fornecedores
app.delete("/fornecedores/:id", async (req, res) => {
    try {

        const { id } = req.params

        await prisma.fornecedores.delete({
            where: {
                id
            }
        })

        res.status(204).send();

    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//PUT / fornecedores
app.put("/fornecedores/:id", async (req, res) => {
    try {

        const { id } = req.params

        const {
            nome,
            cep,
            cidade,
            estado,
            bairro,
            rua,
            numero,
            descricao,
            email,
            telefone,
            ativo
        } = req.body

        const fornecedor = await prisma.fornecedores.update({

            where: {
                id: id
            },
            data: {
                nome,
                cep,
                cidade,
                estado,
                bairro,
                rua,
                numero,
                descricao,
                email,
                telefone,
                ativo
            },
            include: {
                produtos: true,
                madeiras: true
            }
        })

        res.status(201).json(fornecedor)

    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }

})

//POST / adicionar mais produtos ao fornecedor existente
app.post("/fornecedores/:id/produtos", async (req, res) => {
    try {
        const { id } = req.params
        const { produtos } = req.body

        const fornecedor = await prisma.fornecedores.update({
            where: {
                id: id
            },
            data: {
                produtos: {
                    create: produtos
                }
            },
            include: {
                produtos: true,
                madeiras: true
            }
        })

        res.json(fornecedor)

    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//POST / adicionar madeiras existentes
app.post("/fornecedores/:id/madeiras", async (req, res) => {
    try {

        const { id } = req.params
        const { madeiras } = req.body

        const fornecedor = await prisma.fornecedores.update({
            where: {
                id: id
            },
            data: {
                madeiras: {
                    create: madeiras
                }
            },
            include: {
                madeiras: true,
                produtos: true
            }
        })

        res.status(201).json(fornecedor)

    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }

})

//#endregion

//#region Produtos

/* 
Produtos
*/

//POST / produtos
app.post("/produtos", async (req, res) => {
    try {
        const { nome, valor, quantidade, quantidadeMin, acabando, fornecedorId, madeiraId, tamanhoId, unidade } = req.body

        const repetido = await prisma.produtos.findMany({
            where: {
                nome,
                ativo: true
            }
        })

        if (repetido.length > 0) return res.status(400).json({ message: "esse produto já existe" })

        const produtoSalvo = await prisma.$transaction(async (tx) => {

            const produtoId = await getNextId("produtos");

            const produto = await tx.produtos.create({
                data: {
                    id: produtoId,
                    nome,
                    valor,
                    unidade,
                    quantidade,
                    quantidadeMin,
                    acabando,
                    fornecedorId,
                    madeiraId,
                    tamanhoId
                },
                include: {
                    fornecedor: true,
                    madeira: true,
                    tamanho: true
                }
            })
            return produto
        })
        
        res.status(201).json(produtoSalvo)


    } catch (error) {

        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });//usado para mandar a mensagem de status de que deu erro
    }
})

//GET / produtos
app.get("/produtos", async (req, res) => {
    try {
        const { nome, quantidade, acabando, nomeFornecedor, nomeMadeira, nomeTamanho, ativo, unidade } = req.query
        let produto = []
        const where = {}

        if (Object.keys(req.query).length > 0) {

            if (nome) where.nome = { contains: nome, mode: "insensitive" }
            if (quantidade) where.quantidade = quantidade
            if (acabando) where.acabando = acabando === 'true';
            if (ativo) where.ativo = ativo === 'true';
            if (unidade) where.unidade = {contains: unidade, mode: "insensitive"}



            if (req.query.nomeFornecedor) {
                where.fornecedor = {
                    nome: { contains: nomeFornecedor, mode: "insensitive" }
                }
            }
            if (req.query.nomeMadeira) {
                where.madeira = {
                    nome: { contains: nomeMadeira, mode: "insensitive" }
                }
            }
            if (req.query.nomeTamanho) {
                where.tamanho = {
                    nome: { contains: nomeTamanho, mode: "insensitive" }
                }
            }
        }

        produto = await prisma.produtos.findMany({
            where,
            include: {
                fornecedor: true,
                madeira: true,
                tamanho: true
            }
        })

        res.status(200).json(produto)

    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//GET by id / Produtos
app.get("/produtos/:id", async (req, res) => {
    try {

        const id = parseInt(req.params.id);

        if (isNaN(id)) return res.status(404).json({ error: 'Id inválido' })

        const produto = await prisma.produtos.findUnique({
            where: {
                id
            },
            include: {
                fornecedor: true,
                madeira: true,
                tamanho: true
            }
        })

        if (!produto) return res.status(400).json({ message: "produto não encontrado" })

        res.status(200).json(produto)

    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message })
    }
})

//DELETE / deletar os produtos existentes
app.delete("/produtos/:id", async (req, res) => {
    try {

        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(404).json({ error: 'Id inválido' })

        const existe = await prisma.produtos.findUnique({
            where: {
                id
            }
        })

        if (!existe) return res.status(400).json({ message: 'produto não existe' })

        const produto = await prisma.produtos.delete({
            where: {
                id
            }
        })



        res.status(204).send()

    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//PUT / produtos
app.put("/produtos/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        if (isNaN(id)) return res.status(404).json({ error: 'Id inválido' })

        const existe = await prisma.produtos.findUnique({
            where: { id }
        })

        if (!existe) return res.status(400).json({ message: 'o produto não existe' })

        const { nome, valor, quantidade, quantidadeMin, acabando, fornecedorId, madeiraId, unidade, tamanhoId, ativo } = req.body

        const produto = await prisma.produtos.update({
            where: {
                id
            },
            data: {
                nome,
                valor,
                quantidade,
                unidade,
                quantidadeMin,
                acabando,
                fornecedorId,
                madeiraId,
                tamanhoId,
                ativo
            }
        })

        res.status(201).json(produto)
    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//#endregion

//#region Madeiras

//POST / madeiras
app.post("/madeiras", async (req, res) => {
    try {
        const { nome, fornecedorId } = req.body
        const madeiraId = await getNextId('madeiras')

        const repetido = await prisma.madeiras.findMany({
            where: {
                nome,
                ativo: true
            }
        })

        if (repetido.length > 0) return res.status(404).json({ error: "madeira com esse nome já existente" })

        const madeira = await prisma.madeiras.create({
            data: {
                id: madeiraId,
                nome,
                fornecedorId
            },
            include: {
                fornecedor: true
            }
        })

        res.status(201).json(madeira)
    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})
//GET / Madeiras
app.get("/madeiras", async (req, res) => {
    try {
        let madeira = []
        if (Object.keys(req.query).length > 0) {

            const { nome, nomeFornecedor, ativo } = req.query
            const where = {}

            if (nome) where.nome = { contains: nome, mode: "insensitive" }

            if (nomeFornecedor) {
                where.fornecedor = {
                    nome: { contains: nomeFornecedor, mode: "insensitive" }
                }
            }

            if (typeof ativo !== "undefined") {
                // aceita 'true' / 'false' strings
                where.ativo = ativo === "true";
            }

            madeira = await prisma.madeiras.findMany({
                where,
                include: {
                    fornecedor: true
                }
            })

        } else {

            madeira = await prisma.madeiras.findMany({
                include: {
                    fornecedor: true
                }
            })
        }

        res.status(200).json(madeira)

    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//GET by id / Madeiras
app.get("/madeiras/:id", async (req, res) => {
    try {

        const id = parseInt(req.params.id); //converte string em int
        if (isNaN(id)) return res.status(404).json({ error: 'ID inválido' });

        const madeira = await prisma.madeiras.findUnique({
            where: {
                id
            }
        })

        if (!madeira) return res.status(400).json({ message: "madeira não encontrado" })

        res.status(200).json(madeira)

    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message })
    }
})

//PUT /madeiras
app.put("/madeiras/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id); //converte string em int
        if (isNaN(id)) return res.status(404).json({ error: 'ID inválido' });

        const madeira = await prisma.madeiras.findUnique({
            where: {
                id
            }
        })

        if (!madeira) return res.status(400).json({ message: "madeira não encontrado" })

        const { nome, ativo } = req.body

        const madeiras = await prisma.madeiras.update({
            where: {
                id
            },
            data: {
                nome,
                ativo: typeof ativo === "boolean" ? ativo : undefined
            }
        })

        res.status(201).json(madeiras)
    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message })
    }


})

//DELETE / deletar as madeiras existentes
app.delete("/madeiras/:id", async (req, res) => {
    try {

        const id = parseInt(req.params.id); //converte string em int
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

        const madeira = await prisma.madeiras.findUnique({
            where: {
                id
            }
        })

        if (!madeira) return res.status(400).json({ message: "madeira não encontrado" })

        await prisma.madeiras.delete({
            where: {
                id
            }
        })

        res.status(204).send()

    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//#endregion

//#region Clientes

/* 
Clientes
*/

//POST / Clientes / Body
app.post('/clientes', async (req, res) => {
    try {

        const { nome, email, cpf, telefone, cep, cidade, estado, bairro, rua, numero } = req.body

        const Clientes = await prisma.clientes.create({
            data: {
                nome,
                email,
                cpf,
                cep,
                cidade,
                estado,
                bairro,
                rua,
                numero,
                telefone
            }
        })

        res.status(201).json(Clientes)

    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//GET / Clientes
app.get("/clientes", async (req, res) => {
    try {
        let clientes = []

        if (Object.keys(req.query).length > 0) {
            const where = {}

            if (req.query.nome) where.nome = { contains: req.query.nome, mode: "insensitive" }
            if (req.query.email) where.email = { contains: req.query.email, mode: "insensitive" }
            if (req.query.cpf) where.cpf = req.query.cpf
            if (req.query.estado) where.estado = { contains: req.query.estado, mode: "insensitive" }
            if (req.query.cidade) where.cidade = { contains: req.query.cidade, mode: "insensitive" }

            clientes = await prisma.clientes.findMany({
                where
            })

        } else {
            clientes = await prisma.clientes.findMany()
        }

        res.status(200).json(clientes)
    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//GET by id / clientes
app.get('/clientes/:id', async (req, res) => {
    try {

        const { id } = req.params

        const cliente = await prisma.clientes.findUnique({
            where: {
                id
            }
        })

        if (!cliente) return res.status(400).json({ error: "cliente não encontrado" })

        res.status(200).json(cliente)
    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//PUT / clientes
app.put("/clientes/:id", async (req, res) => {
    try {
        const { id } = req.params
        const { nome, email, cpf, telefone, cep, cidade, estado, bairro, rua, numero } = req.body

        const item = await prisma.clientes.findUnique({ where: { id } })
        if (!item) return res.status(400).json({ erro: "Cliente não encontrado" })

        const clientes = await prisma.clientes.update({
            where: {
                id
            },
            data: {
                nome,
                email,
                cpf,
                cep,
                cidade,
                estado,
                bairro,
                rua,
                numero,
                telefone
            }
        })

        res.status(201).json(clientes)

    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//DELETE / clientes
app.delete("/clientes/:id", async (req, res) => {
    try {
        const { id } = req.params

        await prisma.clientes.delete({
            where: {
                id
            }
        })

        res.status(204).send()

    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//#endregion

//#region Tamanhos 


/*
Tamanhos
*/

//POST / tamanhos
app.post("/tamanhos", async (req, res) => {
    try {

        const { nome } = req.body

        const repetido = await prisma.tamanhos.findMany({
            where: {
                nome,
                ativo: true
            }
        })

        if (repetido.length > 0) return res.status(404).json({ error: "tamanho já existente" });

        const tamanhoId = await getNextId('tamanhos')

        const tamanhos = await prisma.tamanhos.create({
            data: {
                nome,
                id: tamanhoId
            }
        })

        res.status(201).json(tamanhos)
    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//Get / tamanhos
app.get("/tamanhos", async (req, res) => {
    try {
        const { nome, ativo } = req.query
        const where = {}

        if (nome) where.nome = { contains: nome, mode: "insensitive" }
        if (typeof ativo !== "undefined") {
            // aceita 'true' / 'false' strings
            where.ativo = ativo === "true";
        }

        let tamanhos = []


        tamanhos = await prisma.tamanhos.findMany({
            where
        })


        res.status(200).json(tamanhos)
    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//GET pelo id / tamanhos
app.get('/tamanhos/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id); //converte string em int
        if (isNaN(id)) return res.status(404).json({ error: 'ID inválido' });

        const tamanho = await prisma.tamanhos.findUnique({
            where: {
                id
            }
        })

        if (!tamanho) {
            return res.status(400).json({ erro: "tamanho não encontrado" })
        }

        res.status(200).json(tamanho)
    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//DELETE /tamanhos
app.delete("/tamanhos/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id); //converte string em int
        if (isNaN(id)) return res.status(404).json({ error: 'ID inválido' });

        const tamanho = await prisma.tamanhos.findUnique({
            where: {
                id
            }
        })

        if (!tamanho) {
            return res.status(400).json({ erro: "tamanho não encontrado" })
        }

        await prisma.tamanhos.delete({
            where: {
                id
            }
        })

        res.status(204).send()
    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//#endregion

//#region EstoqueMadeiras

/*
EstoqueMadeiras
*/

// POST /estoquemadeiras - Criar estoque de madeira
app.post("/estoquemadeiras", async (req, res) => {
    try {
        const { madeiraId, tamanhoId, quantidade, quantidadeMin } = req.body;

        const estoqueMadeiraId = await getNextId('estoqueMadeiras')
        const estoqueMadeira = await prisma.estoqueMadeiras.create({
            data: {
                id: estoqueMadeiraId,
                madeiraId,
                tamanhoId,
                quantidade,
                quantidadeMin
            },
            include: {
                madeira: true,
                tamanho: true
            }
        });

        res.status(201).json(estoqueMadeira);
    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
});

// GET /estoquemadeiras - Listar estoque de madeiras
app.get("/estoquemadeiras", async (req, res) => {
    try {
        let estoqueMadeiras = [];

        const { madeiraId, tamanhoId, acabando, ativo } = req.query;

        // Verifica se há parâmetros de busca
        if (Object.keys(req.query).length > 0) {
            const where = {};

            if (madeiraId) where.madeiraId = madeiraId;
            if (tamanhoId) where.tamanhoId = tamanhoId;
            if (acabando) where.acabando = acabando === 'true';
            if (typeof ativo !== "undefined") where.ativo = ativo === "true";


            // Busca por nome da madeira (nested query)
            if (req.query.nomeMadeira) {
                where.madeira = {
                    nome: {
                        contains: req.query.nomeMadeira,
                        mode: 'insensitive'
                    }
                };
            }

            // Busca por nome do tamanho
            if (req.query.nomeTamanho) {
                where.tamanho = {
                    nome: {
                        contains: req.query.nomeTamanho,
                        mode: 'insensitive'
                    }
                };
            }

            estoqueMadeiras = await prisma.estoqueMadeiras.findMany({
                where,
                include: {
                    madeira: true,
                    tamanho: true
                }
            });
        } else {
            estoqueMadeiras = await prisma.estoqueMadeiras.findMany({
                include: {
                    madeira: true,
                    tamanho: true
                }
            });
        }

        res.status(200).json(estoqueMadeiras);
    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
});

// GET /estoquemadeiras/:id - Buscar estoque específico
app.get("/estoquemadeiras/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) return res.status(404).json({ error: "o id está incorreto" })


        const estoqueMadeira = await prisma.estoqueMadeiras.findUnique({
            where: { id },
            include: {
                madeira: true,
                tamanho: true
            }
        });

        if (!estoqueMadeira) {
            return res.status(404).json({ erro: "Estoque não encontrado" });
        }

        res.json(estoqueMadeira);
    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
});

//PUT /estoqueMadeiras - Atualizar o estoque existente
app.put("/estoquemadeiras/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) return res.status(404).json({ error: "o id está incorreto" })

        const existente = await prisma.estoqueMadeiras.findUnique({
            where: { id }
        })

        if (!existente) return res.status(400).json({ error: "estoque não existente" })

        const { madeiraId, tamanhoId, quantidade, quantidadeMin, acabando, ativo } = req.body;

        const estoqueMadeira = await prisma.estoqueMadeiras.update({
            where: {
                id
            },
            data: {
                madeiraId,
                tamanhoId,
                quantidade,
                acabando: typeof acabando === "boolean" ? acabando : undefined,
                quantidadeMin,
                ativo: typeof ativo === "boolean" ? ativo : undefined
            },
            include: {
                madeira: true,
                tamanho: true
            }
        });

        res.status(201).json(estoqueMadeira);
    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
});

//DELETE /estoqueMadeiras - deletetar o estoque existente
app.delete('/estoquemadeiras/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) return res.status(404).json({ error: "o id está incorreto" })

        const existente = await prisma.estoqueMadeiras.findMany({
            where: { id }
        })

        if (!existente) return res.status(400).json({ error: "estoque não existente" })

        await prisma.estoqueMadeiras.delete({
            where: {
                id
            }
        })

        res.status(204).send();

    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})


//#endregion

//#region EstoqueProdutos

/*
Estoque Produtos
*/

//POST / estoqueprodutos
app.post('/estoqueprodutos', async (req, res) => {
    try {
        const { produtoId, quantidade } = req.body
        const estoque = await prisma.estoqueProdutos.create({
            data: {
                produtoId,
                quantidade
            }
        })

        res.status(201).json(estoque)
    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//GET /estoqueprodutos
app.get("/estoqueprodutos", async (req, res) => {
    try {
        let estoque = []

        if (Object.keys(req.query).length > 0) {
            const where = {}

            if (req.query.nome) where.nome = { contains: req.query.nome, mode: "insensitive" }

            estoque = await prisma.estoqueProdutos.findMany({
                where,
                include: {
                    produto: true
                }
            })

        } else {
            estoque = await prisma.estoqueProdutos.findMany({
                include: {
                    produto: true
                }
            })
        }

        res.status(200).json(estoque)
    } catch (error) {
        console.log('Erro:', error);
        res.status(400).json({ erro: error.message });
    }
})

//#endregion

//#region Peças



/*
Peças
*/

//POST / pecas
app.post('/pecas', async (req, res) => {
    try {

        const { nome, valor, unidade } = req.body

        const peca = await prisma.pecas.create({
            data: {
                nome,
                valor,
                unidade
            }
        })

        res.status(201).json(peca)
    } catch (error) {
        console.log("Erro:", error.message)
        res.status(400).json({ erro: error.message })
    }
})

//GET / peças
app.get('/pecas', async (req, res) => {
    try {

        let pecas = []

        if (Object.keys(req.query).length > 0) {
            const where = {}

            if (req.query.nome) where.nome = { contains: req.query.nome, mode: "insensitive" }
            if (req.query.unidade) where.unidade = { contains: req.query.unidade, mode: "insensitive" }

            pecas = await prisma.pecas.findMany({
                where
            })


        } else {
            pecas = await prisma.pecas.findMany()

        }

        res.status(200).json(pecas)

    } catch (error) {
        console.log("Erro:", error.message)
        res.json({ error: error.message })
    }
})

//Get by id / peças
app.get('/pecas/:id', async (req, res) => {
    try {

        const { id } = req.params

        const peca = await prisma.pecas.findUnique({
            where: {
                id
            }
        })

        if (!peca) return res.json({ message: "peça não encontrada" })

        res.status(200).json(peca)
    } catch (error) {
        console.log("Erro:", error.message)
        res.json({ error: error.message })
    }
})

//Put / peças
app.put('/pecas/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { nome, valor, unidade } = req.body

        const peca = await prisma.pecas.update({
            where: {
                id
            },
            data: {
                nome,
                valor,
                unidade
            }
        })

        res.status(201).json(peca)
    } catch (error) {
        console.log("Erro:", error.message)
        res.status(400).json({ erro: error.message })
    }
})

//DELETE / peças
app.delete('/pecas/:id', async (req, res) => {
    try {

        const { id } = req.params

        await prisma.pecas.delete({
            where: {
                id
            }
        })

        res.status(200).json({ message: "Peça deletada com sucesso" })
    } catch (error) {
        console.log("Erro:", error.message)
        res.json({ error: error.message })
    }
})

//#endregion

//#region Orçamentos

/*
  Orçamento
*/

// Define include padrão para itens de orçamento
const includeOrcamentoE = {
    orcamentoE: {
        include: {
            produto: { include: { fornecedor: true } },
            peca: true,
            estoqueMadeira: {
                include: {
                    madeira: { include: { fornecedor: true } },
                    tamanho: true
                }
            }
        }
    }
};

// Include completo para orçamentos
const includeOrcamento = {
    usuario: true,
    cliente: true,
    ...includeOrcamentoE
};

// POST /orcamentos
app.post("/orcamentos", async (req, res) => {
    try {
        const { descricao,
            usuarioId,
            clienteId,
            valorTotal,
            orcamentoE,
            nome,
            cep,
            cpf,
            estado,
            cidade,
            bairro,
            rua,
            numero } = req.body;

        const orcamentoEComTotal = (orcamentoE || []).map(item => ({
            ...item,
            valorTotal: item.valorTotal ?? (item.quantidade || 0) * (item.valorVenda || 0),
        }));

        const valorTotalCalculado = orcamentoEComTotal.reduce(
            (acc, item) => acc + item.valorTotal,
            0
        );

        const orcamentoSalvo = await prisma.$transaction(async (tx) => {
            return await tx.orcamento.create({
                data: {
                    descricao,
                    usuarioId,
                    clienteId,
                    nome,
                    cep,
                    cpf,
                    estado,
                    cidade,
                    bairro,
                    rua,
                    numero,
                    valorTotal: valorTotal ?? valorTotalCalculado,
                    orcamentoE: { create: orcamentoEComTotal }
                },
                include: includeOrcamento
            });
        });

        res.status(201).json(orcamentoSalvo);
    } catch (error) {
        console.error("❌ Erro POST /orcamentos:", error.message);
        res.status(400).json({ message: error.message });
    }
});

// GET /orcamentos
app.get("/orcamentos", async (req, res) => {
    try {
        const where = {};
        const orcamentoEConditions = [];

        if (req.query.nomeUsuario) where.usuario = { nome: { contains: req.query.nomeUsuario, mode: "insensitive" } };
        if (req.query.nomeCliente) where.cliente = { nome: { contains: req.query.nomeCliente, mode: "insensitive" } };
        if (req.query.descricao) where.descricao = { contains: req.query.descricao, mode: "insensitive" };
        if (req.query.nome) where.nome = { contains: req.query.nome, mode: "insensitive" };
        if (req.query.cpf) where.cpf = { contains: req.query.cpf, mode: "insensitive" };
        if (req.query.estado) where.estado = { contains: req.query.estado, mode: "insensitive" };
        if (req.query.cidade) where.cidade = { contains: req.query.cidade, mode: "insensitive" };

        if (req.query.nomeProduto) orcamentoEConditions.push({ produto: { nome: { contains: req.query.nomeProduto, mode: "insensitive" } } });
        if (req.query.nomePeca) orcamentoEConditions.push({ peca: { nome: { contains: req.query.nomePeca, mode: "insensitive" } } });
        if (req.query.nomeMadeira) orcamentoEConditions.push({ estoqueMadeira: { madeira: { nome: { contains: req.query.nomeMadeira, mode: "insensitive" } } } });

        if (orcamentoEConditions.length > 0) where.orcamentoE = { some: { OR: orcamentoEConditions } };

        const orcamentos = await prisma.orcamento.findMany({
            where,
            include: includeOrcamento,
            orderBy: { dataCriacao: "desc" }
        });

        res.status(200).json(orcamentos);
    } catch (error) {
        console.error("Erro GET /orcamentos:", error.message);
        res.status(400).json({ message: error.message });
    }
});

// GET /orcamentos/:id
app.get("/orcamentos/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const orcamento = await prisma.orcamento.findUnique({
            where: { id },
            include: includeOrcamento
        });

        if (!orcamento) return res.status(404).json({ message: "Orçamento não encontrado" });

        orcamento.valorTotalCalculado = orcamento.orcamentoE.reduce((acc, e) => acc + (e.valorTotal || 0), 0);

        res.status(200).json(orcamento);
    } catch (error) {
        console.error("Erro GET /orcamentos/:id:", error.message);
        res.status(400).json({ message: error.message });
    }
});

// PUT /orcamentos/:id
app.put("/orcamentos/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { descricao, clienteId, valorTotal, nome, cpf, cep, cidade, estado, rua, numero, telefone } = req.body;

        const orcamentoAtualizado = await prisma.$transaction(async (tx) => {
            return await tx.orcamento.update({
                where: { id },
                data: {
                    descricao,
                    clienteId,
                    valorTotal,
                    nome,
                    cpf,
                    cep,
                    cidade,
                    estado,
                    rua,
                    numero,
                    telefone
                },
                include: includeOrcamento
            });
        });

        res.status(201).json(orcamentoAtualizado);
    } catch (error) {
        console.error("Erro PUT /orcamentos/:id:", error.message);
        res.status(400).json({ message: error.message });
    }
});

// POST /orcamentos/:id/orcamentosE
app.post("/orcamentos/:id/orcamentosE", async (req, res) => {
    try {
        const { id } = req.params;
        const { orcamentoE } = req.body;

        const resultado = await prisma.$transaction(async (tx) => {
            const novoItem = await tx.orcamento.update({
                where: { id },
                data: { orcamentoE: { create: orcamentoE } },
                include: includeOrcamento
            });

            // Recalcula total
            const itens = await tx.orcamentoE.findMany({ where: { orcamentoId: id } });
            const valorTotalAtualizado = itens.reduce((acc, i) => acc + (i.valorTotal || 0), 0);
            await tx.orcamento.update({ where: { id }, data: { valorTotal: valorTotalAtualizado } });

            return novoItem;
        });

        res.status(201).json(resultado);
    } catch (error) {
        console.error("Erro POST /orcamentos/:id/orcamentosE:", error.message);
        res.status(400).json({ message: error.message });
    }
});

// DELETE /orcamentos/:id
app.delete("/orcamentos/:id", async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.$transaction(async (tx) => {
            await tx.orcamentoE.deleteMany({ where: { orcamentoId: id } });
            await tx.orcamento.delete({ where: { id } });
        });

        res.status(204).send();
    } catch (error) {
        console.error("Erro DELETE /orcamentos/:id:", error.message);
        res.status(400).json({ message: error.message });
    }
});

// PUT /orcamentosE/:id
app.put("/orcamentosE/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { estoqueMadeiraId, produtoId, pecaId, quantidade, valorVenda, valorTotal } = req.body;

        const itemAtualizado = await prisma.$transaction(async (tx) => {
            const atual = await tx.orcamentoE.update({
                where: { id },
                data: { estoqueMadeiraId, produtoId, pecaId, quantidade, valorVenda, valorTotal }
            });

            // Recalcula total do orçamento pai
            const itens = await tx.orcamentoE.findMany({ where: { orcamentoId: atual.orcamentoId } });
            const valorTotalAtualizado = itens.reduce((acc, i) => acc + (i.valorTotal || 0), 0);
            await tx.orcamento.update({ where: { id: atual.orcamentoId }, data: { valorTotal: valorTotalAtualizado } });

            return atual;
        });

        res.status(201).json(itemAtualizado);
    } catch (error) {
        console.error("Erro PUT /orcamentosE/:id:", error.message);
        res.status(400).json({ message: error.message });
    }
});

// DELETE /orcamentosE/:id
app.delete("/orcamentosE/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await prisma.$transaction(async (tx) => {
            const item = await tx.orcamentoE.findUnique({ where: { id } });
            if (!item) throw new Error("Item de orçamento não encontrado");

            await tx.orcamentoE.delete({ where: { id } });

            const itensRestantes = await tx.orcamentoE.findMany({ where: { orcamentoId: item.orcamentoId } });
            const valorTotalAtualizado = itensRestantes.reduce((acc, i) => acc + (i.valorTotal || 0), 0);

            return await tx.orcamento.update({ where: { id: item.orcamentoId }, data: { valorTotal: valorTotalAtualizado } });
        });

        res.status(204).send();
    } catch (error) {
        console.error("❌ Erro DELETE /orcamentosE/:id:", error.message);
        res.status(400).json({ message: error.message });
    }
});

//#endregion

//#region Vendas

// -----------------------------
// ROTAS DE VENDAS
// -----------------------------

// POST /vendas
// Cria uma venda a partir do body. body pode conter vendaE: [ { produtoId|pecaId|estoqueMadeiraId, quantidade, valorVenda, valorTotal } ]
app.post("/vendas", async (req, res) => {
    try {
        const { descricao, usuarioId, clienteId, dataPagamento, pago, valorTotal, vendaE, nome, cpf, cep, estado, cidade, bairro, rua, numero, telefone } = req.body;

        // 🔹 Calcula valorTotal de cada item
        const vendaEComTotal = (vendaE || []).map(item => ({
            ...item,
            valorTotal: item.valorTotal ?? (item.quantidade || 0) * (item.valorVenda || 0),
        }));

        // 🔹 Calcula o total geral da venda
        const valorTotalCalculado = vendaEComTotal.reduce(
            (acc, item) => acc + item.valorTotal,
            0
        );

        // 🔹 formata  a data corretamente
        const dataPagamentoFormatada = dataPagamento
            ? new Date(dataPagamento.includes("T") ? dataPagamento : `${dataPagamento}T00:00:00`)
            : null;

        // 🔹 Transação: cria a venda e atualiza estoques de forma atômica
        const vendaSalva = await prisma.$transaction(async (tx) => {
            // 🔸 Valida estoque antes
            for (const item of vendaEComTotal) {
                if (item.estoqueMadeiraId) {
                    const estoque = await tx.estoqueMadeiras.findUnique({
                        where: { id: item.estoqueMadeiraId },
                    });
                    if (!estoque || estoque.quantidade < item.quantidade) {
                        throw new Error(
                            `Estoque insuficiente para a madeira (ID: ${item.estoqueMadeiraId}).`
                        );
                    }
                }

                if (item.produtoId) {
                    const produto = await tx.produtos.findUnique({
                        where: { id: item.produtoId },
                    });
                    if (!produto || produto.quantidade < item.quantidade) {
                        throw new Error(
                            `Estoque insuficiente para o produto (ID: ${item.produtoId}).`
                        );
                    }
                }
            }

            // 🔸 Gera o ID para a venda principal
            const vendaId = await getNextId('vendas');

            // 🔸 Gera IDs para cada item de VendasE
            const vendaEComIds = await Promise.all(
                vendaEComTotal.map(async (item) => ({
                    id: await getNextId('vendasE'),
                    ...item
                }))
            );

            // 🔸 Cria a venda
            const novaVenda = await tx.vendas.create({
                data: {
                    id: vendaId,
                    descricao,
                    nome,
                    cpf,
                    cep,
                    estado,
                    cidade,
                    bairro,
                    rua,
                    numero,
                    telefone,
                    valorTotal: valorTotal ?? valorTotalCalculado,
                    dataPagamento: dataPagamentoFormatada,
                    usuario: { connect: { id: usuarioId } },
                    ...(clienteId ? { cliente: { connect: { id: clienteId } } } : {}),
                    pago: pago === "true" || pago === true,
                    vendaE: {
                        create: vendaEComIds,
                    },
                },
                include: {
                    usuario: true,
                    cliente: true,
                    vendaE: {
                        include: {
                            produto: true,
                            peca: true,
                            estoqueMadeira: {
                                include: { madeira: true, tamanho: true },
                            },
                        },
                    },
                },
            });

            // 🔸 Decrementa do estoque
            for (const item of novaVenda.vendaE) {
                if (item.produtoId) {
                    await tx.produtos.update({
                        where: { id: item.produtoId },
                        data: { quantidade: { decrement: item.quantidade } },
                    });
                }
                if (item.estoqueMadeiraId) {
                    await tx.estoqueMadeiras.update({
                        where: { id: item.estoqueMadeiraId },
                        data: { quantidade: { decrement: item.quantidade } },
                    });
                }
            }

            return novaVenda;
        });

        // 🔹 Sucesso!
        res.status(201).json(vendaSalva);
    } catch (error) {
        console.error("❌ Erro POST /vendas:", error.message);
        res.status(400).json({ message: error.message });
    }
});


// POST /vendas/from-orcamento/:id
// Converte um orçamento existente em venda (cria venda com os itens do orçamento)
app.post("/vendas/from-orcamento/:id", async (req, res) => {
    try {
        const { id } = req.params; // id do orçamento
        const { descricao, usuarioId, clienteId, dataPagamento, pago, valorTotal, nome, cpf, cep, estado, cidade, bairro, rua, numero, telefone } = req.body;

        const orcamento = await prisma.orcamento.findUnique({
            where: { id },
            include: { orcamentoE: true }
        });

        if (!orcamento) return res.status(404).json({ message: "Orçamento não encontrado" });

        const vendaEFromOrcamento = orcamento.orcamentoE.map(item => ({
            produtoId: item.produtoId,
            pecaId: item.pecaId,
            estoqueMadeiraId: item.estoqueMadeiraId,
            quantidade: item.quantidade || 0,
            valorVenda: item.valorVenda || 0,
            valorTotal: item.valorTotal || 0
        }));

        const valorTotalCalculado = valorTotal ?? vendaEFromOrcamento.reduce((acc, i) => acc + (i.valorTotal || 0), 0);

        // Formata a data de pagamento
        const dataPagamentoFormatada = dataPagamento
            ? new Date(dataPagamento.includes("T") ? dataPagamento : `${dataPagamento}T00:00:00`)
            : null;

        // Transação atômica
        const vendaSalva = await prisma.$transaction(async (tx) => {
            // 🔸 Valida estoque antes
            for (const item of vendaEFromOrcamento) {
                if (item.estoqueMadeiraId) {
                    const estoque = await tx.estoqueMadeiras.findUnique({
                        where: { id: item.estoqueMadeiraId }
                    });
                    if (!estoque || estoque.quantidade < item.quantidade) {
                        throw new Error(`Estoque insuficiente para a madeira (ID: ${item.estoqueMadeiraId}).`);
                    }
                }

                if (item.produtoId) {
                    const produto = await tx.produtos.findUnique({
                        where: { id: item.produtoId }
                    });
                    if (!produto || produto.quantidade < item.quantidade) {
                        throw new Error(`Estoque insuficiente para o produto (ID: ${item.produtoId}).`);
                    }
                }
            }

            // 🔸 Cria a venda
            const novaVenda = await tx.vendas.create({
                data: {
                    descricao: descricao || orcamento.descricao || `Venda a partir do orçamento ${id}`,
                    usuarioId: usuarioId || orcamento.usuarioId,
                    clienteId: clienteId || orcamento.clienteId,
                    nome: nome || orcamento.nome,
                    cpf: cpf || orcamento.cpf,
                    cep: cep || orcamento.cep,
                    estado: estado || orcamento.estado,
                    cidade: cidade || orcamento.cidade,
                    bairro: bairro || orcamento.bairro,
                    rua: rua || orcamento.rua,
                    numero: numero || orcamento.numero,
                    telefone: telefone || orcamento.telefone,
                    valorTotal: valorTotalCalculado,
                    dataPagamento: dataPagamentoFormatada,
                    pago: !!pago,
                    vendaE: { create: vendaEFromOrcamento }
                },
                include: {
                    usuario: true,
                    cliente: true,
                    vendaE: {
                        include: {
                            produto: true,
                            peca: true,
                            estoqueMadeira: { include: { madeira: true, tamanho: true } }
                        }
                    }
                }
            });

            // 🔸 Decrementa estoque
            for (const item of novaVenda.vendaE) {
                if (item.produtoId) {
                    await tx.produtos.update({
                        where: { id: item.produtoId },
                        data: { quantidade: { decrement: item.quantidade } }
                    });
                }
                if (item.estoqueMadeiraId) {
                    await tx.estoqueMadeiras.update({
                        where: { id: item.estoqueMadeiraId },
                        data: { quantidade: { decrement: item.quantidade } }
                    });
                }
            }

            return novaVenda;
        });

        res.status(201).json(vendaSalva);

    } catch (error) {
        console.error("❌ Erro POST /vendas/from-orcamento:", error.message);
        res.status(400).json({ message: error.message });
    }
});

// GET /vendas
// Busca vendas com filtros opcionais: nomeCliente, nomeUsuario, dataInicio, dataFim, pago=true/false
app.get("/vendas", async (req, res) => {
    try {
        const { nomeCliente, nomeUsuario, dataInicio, dataFim, pago, nomeMadeira, nomeProduto, nomePeca, nome, cpf, cep, estado, cidade, bairro } = req.query;
        const where = {};

        if (nome) where.nome = { contains: nome, mode: "insensitive" };
        if (cpf) where.cpf = { contains: cpf, mode: "insensitive" };
        if (estado) where.estado = { contains: estado, mode: "insensitive" };
        if (cidade) where.cidade = { contains: cidade, mode: "insensitive" };
        if (bairro) where.bairro = { contains: bairro, mode: "insensitive" };

        if (nomeCliente) {
            where.cliente = { nome: { contains: nomeCliente, mode: "insensitive" } };
        }
        if (nomeUsuario) {
            where.usuario = { nome: { contains: nomeUsuario, mode: "insensitive" } };
        }
        if (typeof pago !== "undefined") {
            // aceita 'true' / 'false' strings
            where.pago = pago === "true";
        }
        if (dataInicio || dataFim) {
            where.dataCriacao = {};
            if (dataInicio) where.dataCriacao.gte = new Date(dataInicio);
            if (dataFim) where.dataCriacao.lte = new Date(dataFim);
        }

        // 🔎 Filtros por produto, peça ou madeira
        const vendaEConditions = [];

        if (nomeProduto) {
            vendaEConditions.push({
                produto: {
                    nome: { contains: nomeProduto, mode: "insensitive" },
                },
            });
        }

        if (nomePeca) {
            vendaEConditions.push({
                peca: {
                    nome: { contains: nomePeca, mode: "insensitive" },
                },
            });
        }

        if (nomeMadeira) {
            vendaEConditions.push({
                estoqueMadeira: {
                    madeira: {
                        nome: { contains: nomeMadeira, mode: "insensitive" },
                    },
                },
            });
        }

        if (vendaEConditions.length > 0) {
            // ✅ aplica com OR (qualquer um dos filtros)
            where.vendaE = { some: { OR: vendaEConditions } };
        }

        const vendas = await prisma.vendas.findMany({
            where,
            include: {
                cliente: true,
                usuario: true,
                vendaE: {
                    include: {
                        produto: true,
                        peca: true,
                        estoqueMadeira: { include: { madeira: true, tamanho: true } }
                    }
                }
            },
            orderBy: { dataCriacao: "desc" }
        });

        res.status(200).json(vendas);
    } catch (error) {
        console.error("Erro GET /vendas:", error.message);
        res.status(400).json({ message: error.message });
    }
});

// GET /vendas/:id (detalhado)
app.get("/vendas/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const venda = await prisma.vendas.findUnique({
            where: { id },
            include: {
                cliente: true,
                usuario: true,
                vendaE: {
                    include: {
                        produto: { include: { fornecedor: true } },
                        peca: true,
                        estoqueMadeira: { include: { madeira: true, tamanho: true } }
                    }
                }
            }
        });

        if (!venda) return res.status(404).json({ message: "Venda não encontrada" });

        // garantir consistência do total
        const valorTotalCalculado = (venda.vendaE || []).reduce((acc, i) => acc + (i.valorTotal || 0), 0);
        venda.valorTotalCalculado = valorTotalCalculado;

        res.status(200).json(venda);
    } catch (error) {
        console.error("Erro GET /vendas/:id:", error.message);
        res.status(400).json({ message: error.message });
    }
});

// PUT /vendas/:id (atualiza metadados da venda)
app.put("/vendas/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { descricao, clienteId, usuarioId, dataPagamento, pago, nome, cpf, cep, estado, cidade, rua, numero, telefone } = req.body;

        // 🔹 formata  a data corretamente
        const dataPagamentoFormatada = dataPagamento
            ? new Date(dataPagamento.includes("T") ? dataPagamento : `${dataPagamento}T00:00:00`)
            : null;


        const venda = await prisma.vendas.update({
            where: { id },
            data: {
                descricao,
                clienteId,
                usuarioId,
                nome,
                cpf,
                cep,
                estado,
                cidade,
                rua,
                numero,
                telefone,
                dataPagamento: dataPagamentoFormatada || null,
                pago: typeof pago === "boolean" ? pago : undefined
            },
            include: {
                cliente: true,
                usuario: true,
                vendaE: {
                    include: {
                        produto: true,
                        peca: true,
                        estoqueMadeira: {
                            madeira: true
                        }
                    }
                }
            }
        });

        res.status(200).json(venda);
    } catch (error) {
        console.error("Erro PUT /vendas/:id:", error.message);
        res.status(400).json({ message: error.message });
    }
});

// DELETE /vendas/:id
app.delete("/vendas/:id", async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.vendas.delete({ where: { id } });
        await prisma.vendasE.deleteMany({ where: { vendaId: id } });

        // se quiser reverter o estoque aqui, essa é a hora de fazê-lo (buscar vendaE e incrementar de volta)
        res.status(204).send();
    } catch (error) {
        console.error("Erro DELETE /vendas/:id:", error.message);
        res.status(400).json({ message: error.message });
    }
});

// -----------------------------
// ROTAS PARA ITENS (VendasE)
// -----------------------------

// POST /vendas/:id/vendaE  -> adicionar item a uma venda existente
app.post("/vendas/:id/vendaE", async (req, res) => {
    try {
        const { id } = req.params; // venda id
        const { produtoId, pecaId, estoqueMadeiraId, quantidade, valorVenda, valorTotal } = req.body;

        const novoItem = await prisma.vendasE.create({
            data: {
                vendaId: id,
                produtoId: produtoId || null,
                pecaId: pecaId || null,
                estoqueMadeiraId: estoqueMadeiraId || null,
                quantidade,
                valorVenda,
                valorTotal
            },
            include: {
                produto: true,
                peca: true,
                estoqueMadeira: { include: { madeira: true, tamanho: true } }
            }
        });

        // opcional: recalcular valorTotal da venda
        const itens = await prisma.vendasE.findMany({ where: { vendaId: id } });
        const valorTotalAtualizado = itens.reduce((acc, i) => acc + (i.valorTotal || 0), 0);
        await prisma.vendas.update({ where: { id }, data: { valorTotal: valorTotalAtualizado } });

        res.status(201).json(novoItem);
    } catch (error) {
        console.error("Erro POST /vendas/:id/vendaE:", error.message);
        res.status(400).json({ message: error.message });
    }
});

// PUT /vendaE/:id  -> atualizar item de venda
app.put("/vendaE/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { produtoId, pecaId, estoqueMadeiraId, quantidade, valorVenda, valorTotal } = req.body;

        const atual = await prisma.vendasE.update({
            where: { id },
            data: {
                produtoId: produtoId || null,
                pecaId: pecaId || null,
                estoqueMadeiraId: estoqueMadeiraId || null,
                quantidade,
                valorVenda,
                valorTotal
            }
        });

        // atualizar total da venda pai
        const itens = await prisma.vendasE.findMany({ where: { vendaId: atual.vendaId } });
        const valorTotalAtualizado = itens.reduce((acc, i) => acc + (i.valorTotal || 0), 0);
        await prisma.vendas.update({ where: { id: atual.vendaId }, data: { valorTotal: valorTotalAtualizado } });

        res.status(200).json(atual);
    } catch (error) {
        console.error("Erro PUT /vendaE/:id:", error.message);
        res.status(400).json({ message: error.message });
    }
});

// DELETE /vendaE/:id
app.delete("/vendaE/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // buscar item para saber id da venda pai antes de deletar
        const item = await prisma.vendasE.findUnique({ where: { id } });
        if (!item) return res.status(404).json({ message: "Item de venda não encontrado" });

        await prisma.vendasE.delete({ where: { id } });

        // recalcular total da venda pai
        const itensRestantes = await prisma.vendasE.findMany({ where: { vendaId: item.vendaId } });
        const valorTotalAtualizado = itensRestantes.reduce((acc, i) => acc + (i.valorTotal || 0), 0);
        await prisma.vendas.update({ where: { id: item.vendaId }, data: { valorTotal: valorTotalAtualizado } });

        res.status(204).send();
    } catch (error) {
        console.error("Erro DELETE /vendaE/:id:", error.message);
        res.status(400).json({ message: error.message });
    }
});



//#endregion

// Exporta o app para a Vercel entender
export default app;