const productsDB = "BagelStation";

var express = require('express');
const passport = require('passport');  // authentication

var router = express.Router();
var fs = require('fs');

var monk = require('monk');
var db = monk(`localhost:27017/${productsDB}`);
const productsCollection = db.get("products");
const cartCollection = db.get("cart");
const ordersCollection = db.get("orders");
const usersCollection = db.get("users");
const filterOptions = ["Bagel", "Beverage"];
const filterValues = ["bagel", "beverage"];
const User = require('../models/user'); // User Model 
const connectEnsureLogin = require('connect-ensure-login');// authorization

/****************************************************************** */
/****************************************************************** */

var userProfile = {
  "firstName": "Paul",
  "lastName": "Walker",
  "username": "walkerpaul",
  "password": "skyline",
  "dob": "09/12/1973",
  "gender": "male",
  "addresses": [
    {
      "type": "home",
      "location": "Glendale",
      "zipcode": "91020"
    },
    {
      "type": "work",
      "location": "Dallas",
      "zipcode": "75800"
    }
  ],
  "emailId": "paul_walker@gmail.com",
  "phoneNumber": "4678924366",
  "role": "admin"
}
/****************************************************************** */
/****************************************************************** */

router.get('/', function (req, res, next) {
  res.redirect('/login');
});

router.get('/login', function (req, res) {
  res.render('login');
});

router.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

router.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), function (req, res) {
  console.log(req.user)
  usersCollection.findOne({ username: req.user.username }, function (err, userData) {
    if (err) throw err;
    userProfile = userData;
    res.redirect('/home');
  });
});

router.get('/register', function (req, res) {
  res.render('register', { username: "", firstname: "", lastname: "", phonenumber: "", emailid: "", addresses: [], password: "", gender: "", dateofbirth: "", error: "" });
});

router.get('/user', function (req, res) {
  res.json(userProfile);
});

router.post('/register', function (req, res) {
  console.log("In router post");

  var body = req.body;
  var addresses = [];
  var types = typeof req.body["address[address1][addresstype]"] === "string" ? [req.body["address[address1][addresstype]"]] : typeof req.body["address[address1][addresstype]"] === "undefined" ? [] : req.body["address[address1][addresstype]"];
  var locations = typeof req.body["address[address1][location]"] === "string" ? [req.body["address[address1][location]"]] : typeof req.body["address[address1][location]"] === "undefined" ? [] : req.body["address[address1][location]"];
  var zipcodes = typeof req.body["address[address1][zipcode]"] === "string" ? [req.body["address[address1][zipcode]"]] : typeof req.body["address[address1][zipcode]"] === "undefined" ? [] : req.body["address[address1][zipcode]"];

  types.forEach((t, index) => {
    var address = {
      addresstype: t,
      location: locations[index],
      zipcode: zipcodes[index]
    }
    addresses.push(address);
  });
  body.addresses = addresses;

  User.register(new User({ firstname: req.body.firstname, lastname: req.body.lastname, username: req.body.username, dob: req.body.dateofbirth, gender: req.body.gender, emailid: req.body.emailid, phonenumber: req.body.phonenumber, addresses: addresses, role: 'user' }), req.body.password, function (err, user) {
    if (err) {
      body.error = err.message;
      return res.render("register", body);
    }
    else {
      return res.render('login');
    }
  });
});



/**
 * Default route to landing page
 */
router.get('/home', connectEnsureLogin.ensureLoggedIn(), function (req, res) {
  res.render('index', { currentPage: 0, skip: 0, results: [], category: "", userProfile: userProfile, productName: "", categoryFilter: "", filterOptions, filterValues, paginateCategory:"" });
});

//#region Product List and details related


/**
 * Fetches Beverages and Bagels
 */
router.get('/menu', connectEnsureLogin.ensureLoggedIn(), function (req, res) {
  productsCollection.find({ category: { $in: ["beverage", "bagel"] }, isdeleted: false }, { limit: 8, skip: 0, sort: { name: 1 } }, function (err, products) {
    if (err) throw err;
    res.render('index', { currentPage: 1, skip: 0, results: products, category: "Menu", userProfile: userProfile, productName: "", categoryFilter: "", filterOptions, filterValues, paginateCategory:"" });
  });

});

/**
 * Fetches all the Beverages
 */
router.get('/beverages', connectEnsureLogin.ensureLoggedIn(), function (req, res) {
  productsCollection.find({ category: "beverage", isdeleted: false }, { limit: 8, skip: 0, sort: { name: 1 } }, function (err, products) {
    if (err) throw err;
    res.render('index', { currentPage: 1, skip: 0, results: products, category: "Beverages", userProfile: userProfile, productName: "", categoryFilter: "beverage", filterOptions: [filterOptions[1]], filterValues: [filterValues[1]], paginateCategory: "beverage" });
  });

});

/**
 * Fetches count of the Product
 */
router.get('/products/count', function (req, res) {
  var category = req.query.category ? [req.query.category] : ["beverage", "bagel"];

  productsCollection.count({ category: { $in: category }, name: { "$regex": req.query.productName, "$options": "i" }, isdeleted: false }, function (err, count) {
    if (err) throw err;
    res.json({ count });
  });
});

/**
 * Pagination
 */
router.post('/menu', connectEnsureLogin.ensureLoggedIn(), function (req, res) {
  var skip = parseInt(req.body.skip);
  var nextPage = parseInt(req.body.currentPage);
  var categoryTitle = req.body.asm;
  var category = req.body.category === "" ? ["bagel", "beverage"] : [req.body.category];

  var filterOpts = categoryTitle === "Menu" ? filterOptions : categoryTitle === "Bagels" ? [filterOptions[0]] : categoryTitle === "Beverages" ? [filterOptions[1]] : filterOptions;
  var filterVals = categoryTitle === "Menu" ? filterValues : categoryTitle === "Bagels" ? [filterValues[0]] : categoryTitle === "Beverages" ? [filterValues[1]] : filterValues;

  productsCollection.find({ category: { $in: category }, isdeleted: false }, { limit: 8, skip: skip, sort: { name: 1 } }, function (err, products) {
    if (err) throw err;
    res.render('index', { currentPage: nextPage, skip: skip, results: products, category: categoryTitle, userProfile: userProfile, productName: "", categoryFilter: req.body.category, filterOptions: filterOpts, filterValues: filterVals, paginateCategory: req.body.category });
  });
});

/**
 * Fetches all the Bagels
 */
router.get('/bagels', connectEnsureLogin.ensureLoggedIn(), function (req, res) {
  productsCollection.find({ category: "bagel", isdeleted: false }, { limit: 8, skip: 0, sort: { name: 1 } }, function (err, products) {
    if (err) throw err;
    res.render('index', { currentPage: 1, skip: 0, results: products, category: "Bagels", userProfile: userProfile, productName: "", categoryFilter: "bagel", filterOptions: [filterOptions[0]], filterValues: [filterValues[0]], paginateCategory: "bagel" });
  });
});

router.post('/menu/search', function (req, res) {

  var filterOpts = req.body.activeSideMenu === "Bagels" ? [filterOptions[0]] : req.body.activeSideMenu === "Beverages" ? [filterOptions[1]] : filterOptions;
  var filterVals = req.body.activeSideMenu === "Bagels" ? [filterValues[0]] : req.body.activeSideMenu === "Beverages" ? [filterValues[1]] : filterValues;

  if (req.body.productName && !req.body.categoryFilter) {
    productsCollection.find({ name: { "$regex": req.body.productName, "$options": "i" }, category: { $in: ["beverage", "bagel"] }, isdeleted: false }, { limit: 8, skip: 0, sort: { name: 1 } }, function (err, products) {
      if (err) throw err;
      res.render('index', { currentPage: 1, skip: 0, results: products, category: req.body.activeSideMenu, userProfile: userProfile, productName: req.body.productName, categoryFilter: "", filterOptions: filterOpts, filterValues: filterVals, paginateCategory: "" });
    });
  }

  else if (req.body.categoryFilter && !req.body.productName) {
    productsCollection.find({ category: req.body.categoryFilter, isdeleted: false }, { limit: 8, skip: 0, sort: { name: 1 } }, function (err, products) {
      if (err) throw err;
      res.render('index', { currentPage: 1, skip: 0, results: products, category: req.body.activeSideMenu, userProfile: userProfile, productName: "", categoryFilter: req.body.categoryFilter, filterOptions: filterOpts, filterValues: filterVals, paginateCategory: req.body.categoryFilter });
    });
  }

  else if (req.body.productName && req.body.categoryFilter) {
    productsCollection.find({ name: { "$regex": req.body.productName, "$options": "i" }, isdeleted: false, category: req.body.categoryFilter }, { limit: 8, skip: 0, sort: { name: 1 } }, function (err, products) {
      if (err) throw err;
      res.render('index', { currentPage: 1, skip: 0, results: products, category: req.body.activeSideMenu, userProfile: userProfile, productName: req.body.productName, categoryFilter: req.body.categoryFilter, filterOptions: filterOpts, filterValues: filterVals, paginateCategory: req.body.categoryFilter });
    });
  }
  else if (!req.body.productName && !req.body.categoryFilter) {
    res.redirect("/menu");
  }
});

/**
 *Gets the Details of a particular product and the customization products 
 */
router.get('/productdetails/:id', connectEnsureLogin.ensureLoggedIn(), function (req, res) {
  productsCollection.findOne({ _id: req.params.id }, function (err, product) {
    if (err) throw err;
    var categories = ["spread", "sidetubs", "syrup"];
    productsCollection.find({ category: { $in: categories }, isdeleted: false }, function (err, customProducts) {
      var spreads = customProducts.filter(c => c.category === "spread");
      var syrups = customProducts.filter(c => c.category === "syrup");
      res.render('productdetails', { product: product, spreads: spreads, sidetubs: spreads, syrups: syrups });
    });
  });
});

//#endregion

//#region Cart Related Routes

/**
 * Fetches the Products saved in card for the logged in User
 */
router.get('/cart', connectEnsureLogin.ensureLoggedIn(), function (req, res) {
  cartCollection.findOne({ userId: userProfile.username }, function (err, cartValues) {
    if (err) throw err;
    var totalPrice = 0;
    if (cartValues && cartValues.products) {
      totalPrice = getTotalPrice(cartValues.products);
    }
    res.render('cart', { cartValues: cartValues ? cartValues.products : [], itemsCount: cartValues ? cartValues.products.length : 0, totalPrice });
  });
});

/**
 * Used to add Products to the cart
 */
router.post('/addtocart', function (req, res) {
  var controlValues = req.body;
  var productIds = [];
  var quantity = 0;
  var productId = "";
  Object.keys(controlValues).forEach(key => {

    if (key && key.includes("quantity_")) {


      productId = key.split("quantity_")[1];
      productIds.push(productId);
      quantity = controlValues[key];
    }
    else if (key) {
      productIds.push(key);
    }
  });

  var dbCartData = {};
  var cartProduct;
  productsCollection.find({ _id: { $in: productIds } }, function (err, products) {
    cartCollection.findOne({ userId: userProfile.username }, function (err, cartValues) {
      if (err) throw err;

      if (cartValues) {
        dbCartData = cartValues;
      }
      else {
        dbCartData = { userId: userProfile.username, products: [] };
      }


      if (products && products.length) {
        var mainProduct = products.find(p => p._id.toString() === productId);
        products = products.filter(p => p._id.toString() !== productId);

        cartProduct = {
          cartId: monk.id(),
          productCategory: mainProduct.category,
          productName: mainProduct.name,
          productId: mainProduct._id,
          quantity: quantity,
          price: mainProduct.price,
          customizations: []
        }

        products.forEach(prod => {
          cartProduct.customizations.push({
            cartId: monk.id(),
            productCategory: prod.category,
            productName: prod.name,
            productId: prod._id,
            quantity: 1,
            price: prod.price
          });
        });
        dbCartData.products.push(cartProduct);

        cartCollection.update({ userId: userProfile.username },
          {
            $set: {
              products: dbCartData.products
            }
          }, { upsert: true }, function (err, data) {
            res.redirect("cart");
          });
      }
    });
  });
});

/**
 * Deletes a particular product or the customization product from the cart
 */
router.delete('/cart/delete', function (req, res) {
  var body = req.body;
  cartCollection.findOne({ userId: userProfile.username }, function (err, cartValue) {
    var cartData = cartValue;
    if (cartData && cartData.products) {
      var mainProduct = cartData.products.find(p => p.cartId.toString() === body.cartId);
      if (mainProduct) {
        cartData.products = cartData.products.filter(p => p.cartId.toString() !== body.cartId);
      }
      else {
        cartData.products.forEach(prod => {
          if (prod.customizations) {
            var custProduct = prod.customizations.find(p => p.cartId.toString() === body.cartId);
            if (custProduct) {
              prod.customizations = prod.customizations.filter(p => p.cartId.toString() !== body.cartId);
            }
          }
        });
      }
    }

    cartCollection.update({ userId: userProfile.username },
      {
        $set: {
          products: cartData.products
        }
      }, { upsert: true }, function (err, data) {
        res.send("Success");
      });
  });
});

/**
 * Updates the quantity of a product or the customization product in the cart
 */
router.put('/cart/update', function (req, res) {
  var body = req.body;

  cartCollection.findOne({ userId: userProfile.username }, function (err, cartValue) {
    var cartData = cartValue;
    if (cartData && cartData.products) {
      var mainProduct = cartData.products.find(p => p.cartId.toString() === body.cartId);
      if (mainProduct) {
        mainProduct.quantity = body.updatedVal;
      }
      else {
        cartData.products.forEach(prod => {
          if (prod.customizations) {
            var custProduct = prod.customizations.find(p => p.cartId.toString() === body.cartId);
            if (custProduct) {
              custProduct.quantity = body.updatedVal;
            }
          }
        })
      }


      cartCollection.update({ userId: userProfile.username },
        {
          $set: {
            products: cartData.products
          }
        }, { upsert: true }, function (err, data) {
          if (err) throw err;
          var totalPrice = 0;
          if (cartData && cartData.products) {
            totalPrice = getTotalPrice(cartData.products);
          }
          res.send(totalPrice.toString());
        });
    }
    else {
      res.sendStatus(500);
    }
  });
});
//#endregion

router.post("/validatecart", function (req, res) {
  cartCollection.findOne({ userId: userProfile.username }, function (err, cartValues) {
    if (err) throw err;
    var cartProductIds = [];
    var validationInfo = [];
    if (cartValues && cartValues.products) {
      cartValues.products.forEach(p => {
        cartProductIds.push(p.productId);
        validationInfo.push({
          cartId: p.cartId.toString(),
          cartQuantity: p.quantity,
          productId: p.productId.toString(),
          hasError: false,
        });
        p.customizations.forEach(c => {
          cartProductIds.push(c.productId);
          validationInfo.push({
            cartId: c.cartId.toString(),
            cartQuantity: c.quantity,
            productId: c.productId.toString(),
            hasError: false,
          });
        })
      });
    }
    productsCollection.find({ _id: { $in: cartProductIds } }, function (err, products) {
      if (err) throw err;
      if (products && products.length) {
        validationInfo.forEach(v => {
          var stockProd = products.find(p => p._id.toString() === v.productId);
          if (!stockProd) {
            v.hasError = true;
          }
          if (parseInt(stockProd.stockquantity) < parseInt(v.cartQuantity)) {
            v.hasError = true;
            v.stockQuantity = stockProd.stockquantity;
          }
          else {
            stockProd.stockquantity -= parseInt(v.cartQuantity);
          }

        });
        res.send(validationInfo);
      }
    });
  });
});

try {

} catch (error) {

}

router.post("/order", function (req, res) {
  cartCollection.findOne({ userId: userProfile.username }, function (err, cartValues) {
    var products = cartValues.products;

    var productIds = [];
    var orderId = "";
    products.forEach(p => {
      p.totalPrice = parseInt(p.quantity) * parseFloat(p.price);
      productIds.push(p.productId);
      delete p.cartId;
      delete p.price
      p.customizations.forEach(c => {
        c.totalPrice = parseInt(c.quantity) * parseFloat(c.price);
        productIds.push(c.productId);

        delete c.cartId;
        delete c.price
      })
    })

    var orderObject = {
      address: userProfile.addresses[0],//Todo
      userId: userProfile.username,
      products: products
    }
    ordersCollection.insert(orderObject, function (err, data) {
      if (err) throw err;
      orderId = data._id.toString();

      cartCollection.remove({ userId: userProfile.username }, function (err, data) {
        if (err) throw err;
        productsCollection.find({ _id: { $in: productIds } }, function (err, products) {
          productIds.forEach(p => {
            var dbProduct = products.find(f => f._id.toString() === p.toString());
            var orderProduct = orderObject.products.find(f => f.productId.toString() === p.toString());
            if (dbProduct && orderProduct) {
              dbProduct.stockquantity -= parseInt(orderProduct.quantity);
            }
            else {
              orderObject.products.forEach(d => {
                var dbCProduct = products.find(f => f._id.toString() === p.toString());
                var orderCProduct = d.customizations.find(f => f.productId.toString() === p.toString());
                if (dbCProduct && orderCProduct) {
                  dbCProduct.stockquantity -= parseInt(orderCProduct.quantity);
                }
              });
            }
          });

          var tracker = 0;
          var limit = products.length;
          products.forEach(p => {

            productsCollection.update({ _id: p._id },
              {
                $set: {
                  stockquantity: p.stockquantity
                }
              }, function (err, data) {
                if (err) throw err;

                tracker++
                if (tracker === limit) {
                  res.send("Order Successful!! \n Your Order Id is " + orderId);
                }
              });
          });
        });
      });

    });
  });
});

router.get('/item/create', connectEnsureLogin.ensureLoggedIn(), function (req, res) {
  res.render('createorupdateitem', { product: getItemFormBody() });
});

router.post('/item/create', function (req, res) {

  console.log(req.body);

  if (req.files) {
    var file = req.files.image;
    var fileName = file.name;
    file.mv('./public/images/' + fileName, function (err) {
      if (err) throw err;
      productsCollection.insert({
        "name": req.body.name,
        "description": req.body.description,
        "stockquantity": req.body.quantity,
        "price": req.body.price,
        "category": req.body.category,
        "image": fileName,
        "isdeleted": false
      }, function (err, video) {
        if (err) throw err;
        var route = req.body.category === "bagel" ? "bagels" : req.body.category === "beverage" ? "beverages" : "menu";
        if (route)
          res.redirect('/' + route);
      });
    })
  }

});

router.get('/item/update/:id', connectEnsureLogin.ensureLoggedIn(), function (req, res) {
  var status = req.query && req.query.status ? req.query.status : "";
  productsCollection.findOne({ _id: req.params.id }, function (err, product) {
    if (err) throw err;
    var formBody = {
      "id": product._id.toString(),
      "name": product.name,
      "description": product.description,
      "quantity": product.stockquantity,
      "price": product.price,
      "category": product.category,
      "image": product.image,
      "status": status
    }
    res.render('createorupdateitem', { product: formBody });
  });
});

router.post('/item/update', connectEnsureLogin.ensureLoggedIn(), function (req, res) {
  if (req.files) {
    var file = req.files.image;
    var fileName = file.name;
    file.mv('./public/images/' + fileName, function (err) {

      if (req.body.uploadedImage) {
        fs.unlink('./public/images/' + req.body.uploadedImage, (err) => {
          if (err) throw err;

          updateProduct(req.body, fileName, res);
        })
      }
      else {
        updateProduct(req.body, fileName, res);
      }
    });
  }
  else {
    updateProduct(req.body, "", res)
  }
});

router.delete('/item/delete', function (req, res) {
  productsCollection.update({ _id: req.body.id }, {
    $set: {
      isdeleted: true
    }
  }, function (err, resp) {
    if (err) throw err;

    res.send("Item deleted successfully!");

  });

});

router.get('/order/history', connectEnsureLogin.ensureLoggedIn(), function (req, res) {

  ordersCollection.find({ userId: userProfile.username }, function (err, data) {
    data.forEach(d => {
      var orderValue = 0;
      d.products.forEach(p => {
        orderValue += p.totalPrice;
        p.customizations.forEach(c => {
          orderValue += c.totalPrice;
        });
      });
      d.orderValue = orderValue;
    });
    res.render('orderhistory', { orderHistory: data ? data : [] });
  });
});


//#region Helper Methods
/**
 * Calculates the total price of the products in the cart
 * called while loading the Cart and when updating the quantity
 * @param {*} products 
 * @returns 
 */
function getTotalPrice(products) {
  var totalPrice = 0;
  products.forEach(p => {
    totalPrice += (parseFloat(p.price) * parseInt(p.quantity));
    p.customizations.forEach(c => {
      totalPrice += (parseFloat(c.price) * parseInt(c.quantity));
    })
  });
  return totalPrice;
}

function getItemFormBody(product) {
  return {
    "name": product ? product.name : "",
    "description": product ? product.description : "",
    "quantity": product ? product.quantity : "",
    "price": product ? product.price : "",
    "category": product ? product.category : "",
    "image": product ? product.image : "",
    "isdeleted": false,
    "status": ""
  }
}

function updateProduct(body, fileName, res) {
  var data = fileName ? {
    "name": body.name,
    "description": body.description,
    "stockquantity": body.quantity,
    "price": body.price,
    "category": body.category,
    "image": fileName,
  } : {
    "name": body.name,
    "description": body.description,
    "stockquantity": body.quantity,
    "price": body.price,
    "category": body.category
  };
  productsCollection.update({ _id: body.id },
    {
      $set: data
    }, function (err, data) {
      if (err) throw err;
      var path = "/item/update/" + body.id + "/?status=success";
      res.redirect(path);
    });
}

//#endregion

module.exports = router;
