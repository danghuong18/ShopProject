const router = require("express").Router();
const UserModel = require("../model/userModel");
const CartModel = require("../model/cartModel");
const BrandModel = require("../model/brandModel");
const CategoryModel = require("../model/categoryModel");
const ProductModel = require("../model/productModel");
const ProductCodeModel = require("../model/productCodeModel");
const BlackListModel = require("../model/blackListModel");
const { checkLogin } = require("../middleWare/checkAuth");
const { getUserInfo } = require("../middleWare/checkAuth");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { deleteOne } = require("../model/userModel");
const mongoose = require("mongoose");

async function GetListFile(list_id = []) {
  list_file = [];
  try {
    let items = await UserModel.find({ _id: list_id });
    if (items.length > 0) {
      for (x in items) {
        list_file.push(items[x].avatar);
      }
    }
  } catch (error) {}

  return list_file;
}

function DeleteFile(list_file = []) {
  for (x in list_file) {
    if (fs.existsSync(path.join(__dirname, `..${list_file[x]}`))) {
      fs.unlinkSync(path.join(__dirname, `..${list_file[x]}`));
    }
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/upload"));
  },
  filename: function (req, file, cb) {
    var filetypes = /jpeg|jpg|png|gif/;
    var mimetype = filetypes.test(file.mimetype);
    var extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      cb(
        null,
        file.fieldname + "-" + Date.now() + path.extname(file.originalname)
      );
    } else {
      cb("ErrorType");
    }
  },
});

const upload = multer({ storage: storage });

router.get("/", checkLogin, async (req, res) => {
  if (req.login_info.role === "admin") {
    try {
      let sort = req.query.sort;
      let limit = req.query.limit * 1;
      let skip = (req.query.page - 1) * limit;
      let pages = 1;
      let sortby = {};

      if (sort == "name-az") {
        sortby = { fullName: 1 };
      } else if (sort == "name-za") {
        sortby = { fullName: -1 };
      } else if (sort == "username-az") {
        sortby = { username: 1 };
      } else if (sort == "username-za") {
        sortby = { username: -1 };
      } else if (sort == "date-desc") {
        sortby = { createDate: -1 };
      } else if (sort == "date-asc") {
        sortby = { createDate: 1 };
      } else {
        sortby = { createDate: -1 };
      }

      let users = await UserModel.find({}).skip(skip).limit(limit).sort(sortby);
      let all_users = await UserModel.find({});
      if (all_users.length > 0) {
        pages = Math.ceil(all_users.length / limit);
      }
      if (users.length > 0) {
        res.json({
          message: "Succcessed",
          status: 200,
          data: users,
          pages: pages,
        });
      } else {
        res.json({
          message: "Kh??ng c?? th????ng hi???u n??o ????? hi???n th??? c???.",
          status: 400,
        });
      }
    } catch (error) {
      res.json({ message: "Server error!", status: 500, error });
    }
  } else {
    res.json({ message: "B???n kh??ng c?? quy???n ??? ????y.", status: 400 });
  }
});

router.get("/login", getUserInfo, (req, res) => {
  res.render("pages/login", {
    login_info: req.login_info,
  });
});

router.get("/logon", getUserInfo, (req, res) => {
  res.render("pages/logon", {
    login_info: req.login_info,
  });
});

router.get("/profile", getUserInfo, (req, res) => {
  if (req.login_info) {
    res.render("pages/profile", {
      login_info: req.login_info,
      tab: req.query.tab,
    });
  } else {
    res.render("pages/login", {
      login_info: req.login_info,
    });
  }
});

router.get("/cart", getUserInfo, (req, res) => {
  res.render("pages/cart", {
    login_info: req.login_info,
  });
});

router.get("/checkout", getUserInfo, (req, res) => {
  res.render("pages/checkout", {
    login_info: req.login_info,
  });
});

router.post("/getuserinfo", checkLogin, (req, res) => {
  res.json({
    status: 200,
    UserInfo: req.login_info,
    mess: "L???y data th??nh c??ng",
    toastr: "success",
  });
});

router.post("/addcart", checkLogin, async (req, res) => {
  try {
    let oldItemQuantity;
    let token = req.cookies.cookie;
    let userID = jwt.verify(token, "thai").id;
    let productID = req.body.productID;
    let cartID = await UserModel.findOne({ _id: userID }).populate("cartID");
    cartID = cartID.cartID._id;
    let quantity = parseInt(req.body.quantity);
    let data = await ProductModel.findOne({ _id: productID });
    let left = data.quantity;
    let oldItem = await CartModel.findOne({
      _id: cartID,
      listProduct: { $elemMatch: { productID: productID } },
    });
    if (oldItem) {
      oldItemQuantity = oldItem.listProduct;
      oldItemQuantity = oldItemQuantity.filter(function (a, b) {
        if (a.productID == productID) {
          return true;
        }
      });
      oldItemQuantity = oldItemQuantity[0].quantity;
    } else if (quantity > left) {
      res.json({
        status: 400,
        mess: ["Kh??ng ????? h??ng", "Kh??ng ????? h??ng, vui l??ng nh???p l???i s??? l?????ng"],
        toastr: "error",
      });
    } else if (quantity + oldItemQuantity > left) {
      res.json({
        status: 400,
        mess: [
          "S??? l?????ng kh??ng ???????c b?? h??n ho???c b???ng 0",
          "S??? l?????ng kh??ng ???????c b?? h??n ho???c b???ng 0",
        ],
        toastr: "warning",
      });
    }
    if (oldItem) {
      if (oldItemQuantity + quantity <= left) {
        let data = await CartModel.updateOne(
          {
            _id: cartID,
            listProduct: { $elemMatch: { productID: productID } },
          },
          { $inc: { "listProduct.$.quantity": quantity } }
        );
        res.json({
          status: 200,
          data: data,
          mess: ["???? th??m v??o gi??? h??ng", "?????i s??? l?????ng s???n ph???m th??nh c??ng"],
          toastr: "success",
        });
      } else {
        res.json({
          status: 400,
          mess: ["Kh??ng ????? h??ng", "Kh??ng ????? h??ng, vui l??ng nh???p l???i s??? l?????ng"],
          toastr: "warning",
        });
      }
    } else {
      data = await CartModel.updateOne(
        { _id: cartID },
        {
          $push: {
            listProduct: {
              productID: productID,
              quantity: quantity,
            },
          },
        }
      );
      res.json({
        status: 200,
        mess: ["???? th??m v??o gi??? h??ng", "?????i s??? l?????ng s???n ph???m th??nh c??ng"],
        toastr: "success",
      });
    }
  } catch (err) {
    console.log(err);
    res.json({
      status: 500,
      err: err,
      mess: [
        "???? x???y ra l???i, vui l??ng th??? l???i",
        "???? x???y ra l???i, vui l??ng th??? l???i",
      ],
      toastr: "error",
    });
  }
});

router.post("/cart", checkLogin, async function (req, res) {
  try {
    let cart = await CartModel.findOne({ _id: req.login_info.cartID });
    cart = cart.listProduct;
    let data = [];
    for (let i = 0; i < cart.length; i++) {
      let pushData = await ProductModel.findOne({ _id: cart[i].productID });
      pushData = pushData.toObject();
      data.push(pushData);
      let productCode = await ProductCodeModel.findOne({
        productID: { $all: [cart[i].productID] },
      });
      title = productCode.productName;
      let productCodeID = productCode._id;
      data[i].quantity = cart[i].quantity;
      data[i].title = title;
      data[i].productCodeID = productCodeID;
      data[i].selected = cart[i].selected;
    }
    res.json({
      status: 200,
      data: data,
      mess: "L???y data th??nh c??ng",
    });
  } catch (err) {
    console.log(err);
    res.json({
      status: 500,
      err: err,
      mess: "???? x???y ra l???i, vui l??ng th??? l???i",
    });
  }
});

router.delete("/cart/delete", checkLogin, async function (req, res) {
  try {
    let token = req.cookies.cookie;
    let userID = jwt.verify(token, "thai").id;
    let productID = req.body.productID;
    let cartID = await UserModel.findOne({ _id: userID });
    cartID = cartID.cartID;
    let data = await CartModel.updateOne(
      { _id: cartID },
      { $pull: { listProduct: { productID: productID } } }
    );
    res.json({
      status: 200,
      data: data,
      mess: "X??a s???n ph???m th??nh c??ng",
      toastr: "success",
    });
  } catch (err) {
    res.json({
      status: 500,
      err: err,
      mess: "???? x???y ra l???i, vui l??ng th??? l???i",
      toastr: "error",
    });
  }
});

router.post("/addcheckout", checkLogin, async (req, res) => {
  try {
    // let data = await CartModel.updateOne(
    //   {
    //     _id: req.login_info.cartID,
    //     "listProduct.selected": 1,
    //     // listProduct: {
    //     //   $elemMatch: { selected: { $in: 1 } },
    //     // },
    //   },
    //   { $set: { "listProduct.$.selected": 0 } }
    // );
    let data = await CartModel.updateOne(
      {
        _id: req.login_info.cartID,
      },
      {
        $set: { "listProduct.$[i].selected": 0 },
      },
      {
        arrayFilters: [{ "i.selected": { $in: 1 } }],
      }
    );
    if (typeof req.body["addcheckout[]"] == "string") {
      await CartModel.updateOne(
        {
          _id: req.login_info.cartID,
          "listProduct.productID": req.body["addcheckout[]"],
        },
        { $set: { "listProduct.$.selected": 1 } }
      );
    } else {
      console.log(337, req.body);
      let data = await CartModel.updateOne(
        {
          _id: req.login_info.cartID,
        },
        {
          $set: { "listProduct.$[i].selected": 1 },
        },
        {
          arrayFilters: [{ "i.productID": { $in: req.body["addcheckout[]"] } }],
        }
      );
      console.log(338, data);
    }
    res.json({
      message: "Redirecting",
      status: 200,
    });
  } catch (err) {
    console.log(err);
    res.json({
      mess: "???? x???y ra l???i, vui l??ng th??? l???i",
      status: 500,
      err: err,
      toastr: "error",
    });
  }
});

router.post("/getcheckout", checkLogin, async (req, res) => {
  try {
    let data = await CartModel.findOne({
      _id: req.login_info.cartID,
    }).populate("listProduct.productID");
    for (let i = 0; i < data.listProduct.length; i++) {
      if (data.listProduct[i].selected == 0) {
        data.listProduct.splice(i, 1);
      }
    }
    console.log(data);
    if (data) {
      for (let i = 0; i < data.listProduct.length; i++) {
        data.listProduct[i] = data.listProduct[i].toObject();
        let productName = await ProductCodeModel.findOne({
          productID: { $all: [data.listProduct[i].productID] },
        });
        productName = productName.productName;
        data.listProduct[i].productName = productName;
      }
      res.json({
        status: 200,
        data: data,
        mess: "L???y data th??nh c??ng",
        toastr: "success",
      });
    } else if (data == null) {
      res.json({
        status: 400,
        data: data,
        mess: "B???n ch??a ch???n s???n ph???m g??, h??y ch???n s???n ph???m ????? mua h??ng nh??",
        toastr: "error",
      });
    }
  } catch (err) {
    console.log(err);
    res.json({
      mess: "???? x???y ra l???i, vui l??ng th??? l???i",
      status: 500,
      err: err,
      toastr: "error",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    let now = new Date();
    let username = req.body.username.toLowerCase();
    let password = req.body.password;
    let fullName = req.body.fullName;
    let email = req.body.email.toLowerCase();
    let phone = req.body.phone;
    let gender = req.body.gender != "" ? req.body.gender : "male";
    let createDate = now;
    let dob = now;

    const checkExist = await UserModel.find({
      $or: [{ username: username }, { email: email }],
    });

    if (checkExist.length > 0) {
      res.json({
        status: 400,
        message: "Username ho???c email ???? t???n t???i, vui l??ng ch???n l???i.",
      });
    } else {
      let createCart = await CartModel.create({ listProduct: [] });
      if (createCart) {
        password = await bcrypt.hash(password, 10);

        let createUser = await UserModel.create({
          username: username,
          password: password,
          fullName: fullName,
          email: email,
          phone: phone,
          gender: gender,
          DOB: dob,
          cartID: createCart._id,
          addressList: [],
          createDate: createDate,
        });

        if (createUser) {
          res.json({ status: 200, message: "T???o t??i kho???n th??nh c??ng!" });
        } else {
          await CartModel.deleteOne({ _id: createCart._id });
          res.json({ status: 400, message: "T???o t??i kho???n kh??ng th??nh c??ng." });
        }
      } else {
        res.json({
          status: 400,
          message: "L???i t???o gi??? h??ng, kh??ng th??? t???o t??i kho???n.",
        });
      }
    }
  } catch (error) {
    res.json({ status: 500, message: "Server error!", error });
  }
});

router.post("/login", async (req, res) => {
  try {
    let username = req.body.username.toLowerCase();
    const user = await UserModel.findOne({
      $or: [{ username: username }, { email: username }],
    });

    if (user) {
      const checkPassword = await bcrypt.compare(
        req.body.password,
        user.password
      );

      if (checkPassword) {
        const token = jwt.sign({ id: user._id }, "thai");
        res.json({ status: 200, message: "????ng nh???p th??nh c??ng!", token });
      } else {
        res.json({ status: 400, message: "Sai password, m???i nh???p l???i." });
      }
    } else {
      res.json({
        status: 400,
        message: "Sai username ho???c email, m???i nh???p l???i.",
      });
    }
  } catch (error) {
    res.json({ status: 500, message: "Server error!", error });
  }
});

router.post("/loginCpanel", async (req, res) => {
  try {
    let username = req.body.username.toLowerCase();
    const user = await UserModel.findOne({
      $or: [{ username: username }, { email: username }],
    });
    if (user) {
      const checkPassword = await bcrypt.compare(
        req.body.password,
        user.password
      );
      if (checkPassword) {
        const token = jwt.sign({ id: user._id }, "thai");

        if (user.role === "admin") {
          const cpanel = jwt.sign({ id: "admin" }, "thai");
          res.json({
            message: "????ng nh???p th??nh c??ng!",
            status: 200,
            data: { token, cpanel },
          });
        } else {
          res.json({
            message: "B???n kh??ng c?? quy???n ????ng nh???p ??? ????y.",
            status: 400,
          });
        }
      } else {
        res.json({
          message: "B???n ???? nh???p sai password, m???i nh???p l???i.",
          status: 400,
        });
      }
    } else {
      res.json({
        message: "Username ho???c email kh??ng t???n t???i, m???i nh???p l???i.",
        status: 400,
      });
    }
  } catch (error) {
    res.json({ message: "Server error!", status: 500 });
  }
});

router.post("/accessCpanel", checkLogin, function (req, res) {
  try {
    const cpanel = jwt.sign({ id: "admin" }, "thai");
    if (req.login_info.role === "admin") {
      res.json({ message: "Truy c???p Cpanel th??nh c??ng!", status: 200, cpanel });
    } else {
      res.json({ message: "Kh??ng th??? truy c???p Cpanel.", status: 400 });
    }
  } catch (error) {
    res.json({ message: "Server error!", status: 500, error });
  }
});

router.post("/setRoleCpanel", checkLogin, async (req, res) => {
  if (req.login_info.role === "admin") {
    try {
      let user_id = req.body.user_id;
      let set_role = req.body.set_role;
      let checkUser = await UserModel.findOne({ _id: user_id });
      if (checkUser) {
        if (user_id != req.login_info._id) {
          let update_role = await UserModel.updateOne(
            { _id: user_id },
            { $set: { role: set_role } }
          );
          if (update_role.nModified) {
            res.json({
              message:
                set_role === "admin"
                  ? "Th??m quy???n admin th??nh c??ng!"
                  : "B??? quy???n admin th??nh c??ng!",
              status: 200,
            });
          } else {
            res.json({
              message:
                set_role === "admin"
                  ? "Th??m quy???n admin kh??ng th??nh c??ng."
                  : "B??? quy???n admin kh??ng th??nh c??ng.",
              status: 400,
            });
          }
        } else {
          res.json({
            message: "B???n kh??ng th??? set quy???n c???a ch??nh m??nh.",
            status: 400,
          });
        }
      } else {
        res.json({ message: "Kh??ng t??m th???y user.", status: 400 });
      }
    } catch (error) {
      res.json({ message: "Server error!", status: 500, error });
    }
  } else {
    res.json({ message: "B???n kh??ng c?? quy???n ??? ????y.", status: 400 });
  }
});

router.post("/deleteCpanel", checkLogin, async (req, res) => {
  if (req.login_info.role === "admin") {
    try {
      let list_user = req.body["list_user[]"];
      if (list_user.includes(req.login_info._id)) {
        res.json({ message: "B???n kh??ng th??? xo?? ch??nh m??nh.", status: 400 });
      } else {
        let list_file = await GetListFile(list_user);

        let delete_item = await UserModel.deleteMany({ _id: list_user });
        if (delete_item.deletedCount > 0) {
          DeleteFile(list_file);
          res.json({ message: "Xo?? user th??nh c??ng!", status: 200 });
        } else {
          res.json({ message: "Kh??ng th??? xo?? user.", status: 400 });
        }
      }
    } catch (error) {
      res.json({ message: "Server error!", status: 500, error });
    }
  } else {
    res.json({ message: "B???n kh??ng c?? quy???n ??? ????y.", status: 400 });
  }
});

router.post("/logout", checkLogin, async (req, res) => {
  try {
    const token = req.cookies.cookie;
    await BlackListModel.create({ token });
    res.json({ status: 200, mess: "dang xuat ok" });
  } catch (error) {
    res.json({ status: 500, mess: "???? x???y ra l???i, vui l??ng th??? l???i", error });
  }
});

router.post("/checkLogin", checkLogin, (req, res) => {
  res.json({ status: 200, message: "???? ????ng nh???p!" });
});

router.post("/editProfile", checkLogin, async (req, res) => {
  upload.single("avatar")(req, res, async (err) => {
    if (err) {
      if (err == "ErrorType") {
        res.json({
          message:
            "H??nh ???nh t???i l??n kh??ng h??? tr???, ph???i l?? file *.png, *.jpg, *.gif.",
          status: 406,
        });
      } else {
        res.json({
          message: "L???i trong qu?? tr??nh upload h??nh ???nh.",
          status: 400,
          err,
        });
      }
    } else {
      let avatar = "";

      if (req.file) {
        avatar = "/public/upload/" + req.file.filename;
      }

      try {
        let updateDate = new Date();
        let id = req.login_info._id;
        let fullName = req.body["full-name"];
        let email = req.body.email.toLowerCase();
        let phone = req.body.phone;
        let dob = req.body.year + "-" + req.body.month + "-" + req.body.day;
        let gender = req.body.gender;
        let list_file = await GetListFile([id]);
        let set_data = {};

        const checkExist = await UserModel.findOne({
          $and: [{ _id: { $ne: id } }, { email: email }],
        });

        if (checkExist) {
          if (req.file) {
            DeleteFile([avatar]);
          }
          res.json({
            message: "Email ???? c?? ng?????i s??? d???ng m???i nh???p l???i.",
            status: 400,
          });
        } else {
          if (req.file) {
            set_data = {
              avatar: avatar,
              fullName: fullName,
              email: email,
              phone: phone,
              DOB: dob,
              gender: gender,
              updateDate: updateDate,
            };
          } else {
            set_data = {
              fullName: fullName,
              email: email,
              phone: phone,
              DOB: dob,
              gender: gender,
              updateDate: updateDate,
            };
          }

          let edit_profile = await UserModel.findOneAndUpdate(
            { _id: id },
            { $set: set_data },
            { returnOriginal: false }
          );

          if (edit_profile) {
            if (req.file) {
              DeleteFile(list_file);
            }
            res.json({
              message: "S???a profile th??nh c??ng!",
              status: 200,
              data: edit_profile,
            });
          } else {
            if (req.file) {
              DeleteFile([avatar]);
            }
            res.json({ message: "Kh??ng th??? s???a profile.", status: 400 });
          }
        }
      } catch (error) {
        if (req.file) {
          DeleteFile([avatar]); //Delete image has uploaded
        }
        res.json({ message: "Server error!", status: 500, error });
      }
    }
  });
});

router.post("/addAddress", checkLogin, async (req, res) => {
  try {
    let updateDate = new Date();
    let address = req.body.address;
    let addAddress = await UserModel.findOneAndUpdate(
      { _id: req.login_info._id },
      {
        $push: { addressList: { address: address, active: false } },
        $set: { updateDate: updateDate },
      },
      { returnOriginal: false }
    );

    if (addAddress) {
      res.json({
        message: "Th??m ?????a ch??? th??nh c??ng!",
        status: 200,
        data: addAddress,
      });
    } else {
      res.json({ message: "Th??m ?????a ch??? kh??ng th??nh c??ng.", status: 400 });
    }
  } catch (error) {
    res.json({ message: "Server error!", status: 500, error });
  }
});

router.post("/editAddress", checkLogin, async (req, res) => {
  try {
    let updateDate = new Date();
    let id_address = req.body.id;
    let address = req.body.address;
    let editAddress = await UserModel.findOneAndUpdate(
      { _id: req.login_info._id, "addressList._id": id_address },
      { $set: { "addressList.$.address": address, updateDate: updateDate } },
      { returnOriginal: false }
    );

    console.log(editAddress);
    if (editAddress) {
      res.json({
        message: "S???a ?????a ch??? th??nh c??ng!",
        status: 200,
        data: editAddress,
      });
    } else {
      res.json({ message: "S???a ?????a ch??? kh??ng th??nh c??ng.", status: 400 });
    }
  } catch (error) {
    res.json({ message: "Server error!", status: 500, error });
  }
});

router.post("/deleteAddress", checkLogin, async (req, res) => {
  try {
    let updateDate = new Date();
    let id_address = req.body.id;
    let deleteAddress = await UserModel.findOneAndUpdate(
      { _id: req.login_info._id },
      {
        $pull: { addressList: { _id: id_address } },
        $set: { updateDate: updateDate },
      },
      { returnOriginal: false }
    );

    if (deleteAddress) {
      res.json({
        message: "Xo?? ?????a ch??? th??nh c??ng!",
        status: 200,
        data: deleteAddress,
      });
    } else {
      res.json({ message: "Xo?? ?????a ch??? kh??ng th??nh c??ng.", status: 400 });
    }
  } catch (error) {
    res.json({ message: "Server error!", status: 500, error });
  }
});

router.post("/setDefaultAddress", checkLogin, async (req, res) => {
  try {
    let updateDate = new Date();
    let id_address = req.body.id;
    await UserModel.findOneAndUpdate(
      { _id: req.login_info._id, "addressList.active": true },
      { $set: { "addressList.$[].active": false, updateDate: updateDate } },
      { returnOriginal: false }
    );
    let defaultAddress = await UserModel.findOneAndUpdate(
      { _id: req.login_info._id, "addressList._id": id_address },
      { $set: { "addressList.$.active": true, updateDate: updateDate } },
      { returnOriginal: false }
    );

    if (defaultAddress) {
      res.json({
        message: "???? ?????t l??m ?????a ch??? m???c ?????nh!",
        status: 200,
        data: defaultAddress,
      });
    } else {
      res.json({ message: "?????t ?????a ch??? m???c ?????nh x???y ra l???i.", status: 400 });
    }
  } catch (error) {
    res.json({ message: "Server error!", status: 500, error });
  }
});

router.post("/editPassword", checkLogin, async (req, res) => {
  try {
    let updateDate = new Date();
    let current_password = req.body.current_password;
    let new_password = req.body.new_password;
    let confirm_password = req.body.confirm_password;

    if (confirm_password != new_password) {
      res.json({
        message: "M???t kh???u m???i v?? m???t kh???u x??c minh kh??ng tr??ng kh???p.",
        status: 400,
      });
    } else {
      const user = await UserModel.findOne({ _id: req.login_info._id });

      if (user) {
        const checkPassword = await bcrypt.compare(
          current_password,
          user.password
        );

        if (checkPassword) {
          new_password = await bcrypt.hash(new_password, 10);
          const updatePass = await UserModel.updateOne(
            { _id: req.login_info._id },
            { $set: { password: new_password, updateDate: updateDate } }
          );
          if (updatePass.nModified) {
            res.json({ message: "?????i m???t kh???u th??nh c??ng!", status: 200 });
          } else {
            res.json({
              message: "?????i m???t kh???u kh??ng th??nh c??ng.",
              status: 400,
            });
          }
        } else {
          res.json({
            message: "M???t kh???u hi???n t???i kh??ng ????ng, m???i nh???p l???i.",
            status: 400,
          });
        }
      } else {
        res.json({ message: "C?? l???i trong qu?? tr??nh t??m user.", status: 400 });
      }
    }
  } catch (error) {
    res.json({ message: "Server error!", status: 500, error });
  }
});

module.exports = router;
