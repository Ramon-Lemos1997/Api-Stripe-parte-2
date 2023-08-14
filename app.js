const stripe = require('stripe')(process.env.TOKEN_STRIPE);
const express = require('express');
const app = express();
const axios = require('axios'); 
require('dotenv').config();


const requestQueue = []; 
let processing = false;

app.use(express.raw({ type: 'application/json' }));

app.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    //verifica as assinaturas, minha secreta e a que a stripe envia;
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.ENDPOINTSECRET);
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const sessionCompleted = event.data.object;
      const metadata = JSON.parse(sessionCompleted.metadata.resumeItems);
      //console.log(metadata)
      // adiciono o medatata no array;
      requestQueue.push(metadata);
      processQueue(); // dou inicio ao processamento;

      break;
   
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).send('Bem sucedido.');
});

async function processQueue() {
    //verifico de tem algo no array ou estou processando algo;
  if (processing || requestQueue.length === 0) {
    return;
  }
  //se passar do if mudo para true para processar este dado primeiro;
  processing = true;
  //removo o primeiro item do array e do o seu value para o metadata;
  const metadata = requestQueue.shift(); 

  try {
    //executo o post com os dados do  metadata obtido anteriomente;
    const response = await axios.put('http://localhost:3000/user/resetCart', { checkoutItems: metadata });
    //console.log(response.data);
  } catch (error) {
    //console.error('Erro ao processar a requisição:', error);
  }
  //após enviar para o back-end onde processo e atualizo o estoqu, mudo o processing para false para permitir outro processamento;
  processing = false;

  //chamo o processQueue() novamente para processar a próxima requisição, se houver;
  processQueue();
}

app.listen(process.env.PORT, () => console.log('Running on port 3003'));
