import Stripe from 'stripe'

// Con stripe v22+, la inicialización es directa pero necesitamos
// asegurarnos de que dotenv ya cargó las variables antes de llamar esto
// Por eso exportamos una función que se llama desde los controllers,
// no una instancia creada al importar el módulo

export const getStripe = () => {
  console.log('STRIPE KEY:', process.env.STRIPE_SECRET_KEY?.substring(0, 20)) // log temporal
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY no está definida')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}