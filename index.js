const express = require('express')
const app = express()
const cors = require('cors')
const { default: axios } = require('axios')
const fs = require('fs')
const path = require('path')

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

let clientId, clientSecret, refreshToken, accessToken, baseUrl, PORT, saved = null

if (fs.existsSync('credentials.json')) {
    const credentials = fs.readFileSync('credentials.json');
    saved = JSON.parse(credentials);
    clientId = saved.CLIENT_ID
    clientSecret = saved.CLIENT_SECRET
    accessToken = saved.ACCESS_TOKEN
    refreshToken = saved.REFRESH_TOKEN
    baseUrl = saved.BASE_URL
    PORT = saved.PORT
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
})

app.get('/product-image/:id', async (req, res) => {
    const productId = req.params.id;
    if(productId == 'default-image')
    {
        const defaultImagePath = path.join(__dirname, 'public', 'default-images', 'product-placeholder.jpg');
        res.sendFile(defaultImagePath)
    }
    try {
        const response = await axios.get(`${baseUrl}/Products/${productId}/photo`, {
            headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`
            },
            responseType: 'stream'
        });
        response.data.pipe(res);
    } catch (error) {
        res.status(500).send('Failed to fetch image');
    }
})

app.get('/products', async (req, res) => {
    try {
        const response = await getProducts();
        const products = response.data
        const inStock = products.filter(p => p.Qty_in_Stock > 0);

        let productsMap = {};
        inStock.forEach(product => {
            const category = product.Category?.name || 'Uncategorized';

            // Optionally assign default image
            if (!product.Record_Image) {
                product.imageUrl = `/product-image/default-image`; // fallback
            } else {
                product.imageUrl = `/product-image/${product.id}`;
            }

            if (!productsMap[category]) {
                productsMap[category] = [];
            }

            productsMap[category].push(product);
        });

        res.json(productsMap);
    } catch (error) {
        console.error(error);
        res.status(500).send('Failed to fetch products');
    }
});

app.get('/product/:id',async (req, res) => {
    try {
        const id = req.params.id
        const product = await getProductbyId(id)
        res.json(product)
    } catch (error) {
        console.log(error)
    }
})

app.get('/cartItems',async (req, res) => {
    try{
        const ids = req.query.ids.split(',') || []
        const response = await getProducts()
        const products = response.data
        const filteredProducts = products.filter(product => ids.includes(product.id))
        filteredProducts.forEach( product => {
            if (!product.Record_Image) {
                product.imageUrl = `/product-image/default-image`; // fallback
            } else {
                product.imageUrl = `/product-image/${product.id}`;
            }
        })
        res.json(filteredProducts)
    } catch(error) {
        console.log(error)
    }
})

app.post('/placeOrder', async (req, res) => {
    try{
        const response = await createOrder(req.body)
        const status = response.data[0].status
        const salesOrderId = response.data[0].details.id
        if(status == "success")
        {
            res.json({ message: 'Order placed successfully!', salesOrderId})
        }
        else
        {
            res.json({ message: 'Failed to place Order'})
        }
    }catch(error){
        console.log(error)
    }
})

app.get("/salesOrder/:id", async (req, res) => {
    const salesOrderId = req.params.id;

    try {
        const result = await getSalesOrderById(salesOrderId);
        const data = await getBlueprint(salesOrderId)
        const nextTransitions = data?.blueprint?.transitions || {}
        res.status(200).json({...result, nextTransitions});
    } catch (error) {
        console.error("Error fetching sales order:", error?.response?.data || error.message);
        res.status(500).json({
            message: "Failed to fetch Sales Order",
            error: error?.response?.data || error.message
        });
    }
})
app.post("/performTransition", async (req, res) => {
    const transitionData = req.body
    const response = await updateBlueprint(transitionData)
    res.json(response)
})

async function getProducts()
{
    try {
        const response = await axios.get(`${baseUrl}/Products?fields=Product_Name,Record_Image,Product_Code,Category,Product_Description,Unit_Price,Product_Active,Qty_in_Stock`,{
            headers:{
                Authorization: `Zoho-oauthtoken ${accessToken}`
            }
        })
        return response.data
    } catch (error) {
        if(error.status == 401)
        {
            await getAccessToken()
            return getProducts()
        }
    }
}

async function getProductbyId(productId)
{
    try {
        const response = await axios.get(`${baseUrl}/Products/${productId}?fields=Product_Name,Record_Image,Product_Code,Category,Product_Description,Unit_Price,Product_Active,Qty_in_Stock`,{
            headers:{
                Authorization: `Zoho-oauthtoken ${accessToken}`
            }
        })
        const product = response.data
        if (!product.data[0].Record_Image) {
            product.data[0].imageUrl = `/product-image/default-image`; // fallback
        } else {
            product.data[0].imageUrl = `/product-image/${product.data[0].id}`;
        }
        return product
    } catch (error) {
        if(error.status == 401)
        {
            await getAccessToken()
            return getProductbyId(productId)
        }
    }
}

async function getAccessToken()
{
    const response = await axios.post(
        "https://accounts.localzoho.com/oauth/v2/token",
        null,
        {
          params: {
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "refresh_token",
          },
        }
    )
    const newToken = response.data.access_token
    if(newToken != null)
    {
        accessToken = newToken
        saved.ACCESS_TOKEN = newToken
        console.log(saved)
        fs.writeFileSync('credentials.json', JSON.stringify(saved));
    }
}

async function findByEmail(email)
{
    try {
        const response = await axios.get(
          `${baseUrl}/Contacts/search?email=${email}`,
          {
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
            },
          }
        );
        return response.data;
      } catch (error) {
        console.error("Error finding contact:", error);
        throw error;
    }
}

async function createContact({name, email, phone, shippingStreet, shippingCity, shippingState, shippingZipcode, shippingCountry})
{
    try {
        const contact = await findByEmail(email)
        if(contact?.data)
        {
            return contact.data[0]
        }

        const response = await axios.post(
            `${baseUrl}/Contacts`,
            {
            data: [
                {
                Email: email,
                First_Name: "",
                Last_Name: name,
                Phone: phone,
                Street: shippingStreet,
                City: shippingCity,
                State: shippingState,
                Zipcode: shippingZipcode,
                Country: shippingCountry
                },
            ],
            },
            {
            headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`,
            },
            }
        );

        return response.data.data[0]
    } catch (error) {
        console.log(error)
        throw error
    }
}

async function createOrder({customer, items})
{
    const contact = await createContact(customer)
    const summaryArray = await Promise.all(
        items.map(async item => {
            const product = await getProductbyId(item.id);
            return `${product.data[0].Product_Name} - Qty: ${item.quantity}`;
        })
    );
    try {
        const response = await axios.post(`${baseUrl}/Sales_Orders`,
            {
                data: [
                    {
                        Contact_Name: contact.id,
                        Subject: `Order for ${customer.name}`,
                        Shipping_Street: customer.shippingStreet,
                        Shipping_City: customer.shippingStreet,
                        Shipping_State: customer.shippingState,
                        Shipping_Code: customer.Zipcode,
                        Shipping_Country: customer.shippingCountry,
                        Status: "Order Placed",
                        Ordered_Items: items.map((item) => ({
                            Product_Name: item.id,
                            Quantity: item.quantity,
                        })),
                        Product_Summary: summaryArray.join('\n')
                    }
                  ]
            },
            {
            headers:{
                Authorization: `Zoho-oauthtoken ${accessToken}`
            }
        })
        return response.data
    } catch (error) {
        if(error.status == 401)
        {
            await getAccessToken()
            return createOrder({customer, items})
        }
    }
}
async function getSalesOrderById(id) {
    try{
        const url = `${baseUrl}/Sales_Orders/${id}`;

        const response = await axios.get(url, {
            headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`
            }
        });

        return response.data;
    } catch(error)
    {
        if(error.status == 401)
        {
            await getAccessToken()
            return getSalesOrderById(id)
        }
    }
}

async function getBlueprint(id)
{
    try{
        const url = `${baseUrl}/Sales_Orders/${id}/actions/blueprint`;

        const response = await axios.get(url, {
            headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`
            }
        });

        return response.data;
    }catch(error){
        if(error.status == 401)
        {
            await getAccessToken()
            return getBlueprint(id)
        }
        if(error?.response?.data.code == "RECORD_NOT_IN_PROCESS")
        {
            return {}
        }
    }
}

async function updateBlueprint({blueprint, salesOrderId})
{
    try{
        const url = `${baseUrl}/Sales_Orders/${salesOrderId}/actions/blueprint`;
        const response = await axios.put(url, 
        {
            blueprint: [blueprint] 
        },
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Zoho-oauthtoken ${accessToken}`
            }
        });
        return response.data;
    } catch(error){
        if(error.status == 401)
        {
            await getAccessToken()
            return updateBlueprint({blueprint, salesOrderId})
        }
    }
}

app.listen(PORT,() => {
    console.log("Server is running on port", PORT)
})