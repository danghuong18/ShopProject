const mongoose = require("../model/dbConnect");
const router = require("express").Router();
const ProductCodeModel = require("../model/productCodeModel");
const ProductModel = require("../model/productModel");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { checkLogin } = require("../middleWare/checkAuth");
const { getUserInfo } = require("../middleWare/checkAuth");

async function GetListFile(list_id = []) {
  list_file = [];
  try {
    let items = await ProductModel.find({ _id: list_id });
    if (items.length > 0) {
      for (x in items) {
        list_file.push(items[x].thumb);
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
        sortby = { productName: 1 };
      } else if (sort == "name-za") {
        sortby = { productName: -1 };
      } else if (sort == "date-desc") {
        sortby = { createDate: -1 };
      } else if (sort == "date-asc") {
        sortby = { createDate: 1 };
      } else {
        sortby = { createDate: -1 };
      }

      let products = await ProductCodeModel.find({})
        .populate("categoryID", "categoryName")
        .populate("brand", "brandName")
        .skip(skip)
        .limit(limit)
        .sort(sortby);
      let all_products = await ProductCodeModel.find({});
      if (all_products.length > 0) {
        pages = Math.ceil(all_products.length / limit);
      }
      if (products.length > 0) {
        res.json({
          message: "Succcessed",
          status: 200,
          data: products,
          pages: pages,
        });
      } else {
        res.json({
          message: "Kh??ng c?? s???n ph???m n??o ????? hi???n th??? c???.",
          status: 400,
        });
      }
    } catch (error) {
      res.json({ message: "Server error!", status: 500 });
    }
  } else {
    res.json({ message: "B???n kh??ng c?? quy???n ??? ????y.", status: 400 });
  }
});

router.get("/showProduct", async (req, res) => {
  try {
    let sort = req.query.sort;
    let limit = (req.query.limit ? req.query.limit : 1) * 1;
    let skip = ((req.query.page ? req.query.page : 1) - 1) * limit;
    let from_price = req.query.from * 1;
    let to_price = req.query.to * 1;
    let sortPrice = req.query.sortPrice;

    let q = req.query.q;
    let category = req.query.category;
    let brand = req.query.brand;
    let similar_query = req.query.similar;

    let pages = 1;
    let sortby = {};
    let price_range = {};
    let query = {};
    let categories = {};
    let brands = {};
    let similar = {};

    if (sortPrice == "price-desc") {
      sortby.min = -1;
    } else if (sortPrice == "price-asc") {
      sortby.min = 1;
    }

    if (sort == "date-asc") {
      sortby.createDate = 1;
    } else {
      sortby.createDate = -1;
    }

    if (
      (from_price || from_price == 0) &&
      to_price &&
      !isNaN(from_price) &&
      !isNaN(to_price)
    ) {
      if (to_price >= from_price) {
        price_range = {
          $or: [
            {
              $and: [
                { min: { $gte: from_price } },
                { min: { $lte: to_price } },
              ],
            },
            {
              $and: [
                { max: { $gte: from_price } },
                { max: { $lte: to_price } },
              ],
            },
            {
              $and: [{ min: { $lt: from_price } }, { max: { $gt: to_price } }],
            },
          ],
        };
      }
    }

    if (category) {
      let category_array = category
        .split(",")
        .map((s) => mongoose.Types.ObjectId(s));
      categories = { categoryID: { $in: category_array } };
    }

    if (brand) {
      let brand_array = brand.split(",").map((s) => mongoose.Types.ObjectId(s));
      brands = { brand: { $in: brand_array } };
    }

    if (similar_query) {
      let product = await ProductCodeModel.findOne({ _id: similar_query });
      if (product) {
        q = product.productName;
        similar = {
          $and: [
            { _id: { $ne: mongoose.Types.ObjectId(similar_query) } },
            { categoryID: { $in: product.categoryID } },
          ],
        };
      }
    }

    if (q) {
      query = { $text: { $search: q } };
    }

    let products = await ProductCodeModel.aggregate([
      {
        $match: query
      },
      {
        $match: similar
      },
      {
        $lookup: {
          from: "product",
          foreignField: "_id",
          localField: "productID",
          as: "productID"
        },
      },
      {
        $project: {
          _id: 1,
          productName: 1,
          listImg: 1,
          productID: 1,
          categoryID: 1,
          brand: 1,
          min: { $min: "$productID.price" },
          max: { $max: "$productID.price" },
          createDate: 1
        },
      },
      {
        $match: {
          $and: [categories, brands, price_range]
        },
      },
      {
        $sort: sortby
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: 1
          },
          root: {
            $push: "$$ROOT"
          },
        },
      },
      {
        $unwind: {
          path: "$root"
        },
      },
      { $skip: skip },
      { $limit: limit },
      {
        $group: {
          _id: null,
          total: { $first: "$total" },
          root: { $push: "$root" }
        },
      },
    ]);

    if (products.length > 0) {
      if (products[0].root) {
        let all_products = products[0].total;
        if (all_products > 0) {
          pages = Math.ceil(all_products / limit);
        }

        res.json({
          message: "Succcessed",
          status: 200,
          data: products[0].root,
          pages: pages,
          total: products[0].total
        });
      } else {
        res.json({
          message: "Kh??ng c?? s???n ph???m n??o ????? hi???n th??? c???.",
          status: 400
        });
      }
    } else {
      res.json({
        message: "Kh??ng c?? s???n ph???m n??o ????? hi???n th??? c???.",
        status: 400
      });
    }
  } catch (error) {
    res.json({ message: "Server error!", status: 500 });
  }
});

router.get("/item", checkLogin, async (req, res) => {
  if (req.login_info.role === "admin") {
    try {
      let id = req.query.product_id;
      let sort = req.query.sort;
      let limit = req.query.limit * 1;
      let skip = (req.query.page - 1) * limit;
      let pages = 1;
      let sortby = {};

      if (sort == "price-desc") {
        sortby = { price: -1 };
      } else if (sort == "price-asc") {
        sortby = { price: 1 };
      } else if (sort == "quantity-desc") {
        sortby = { quantity: -1 };
      } else if (sort == "quantity-asc") {
        sortby = { quantity: 1 };
      } else if (sort == "date-desc") {
        sortby = { createDate: -1 };
      } else if (sort == "date-asc") {
        sortby = { createDate: 1 };
      } else {
        sortby = { createDate: -1 };
      }

      let product = await ProductCodeModel.findOne({ _id: id }).populate(
        "productID",
        null,
        null,
        { skip: skip, limit: limit, sort: sortby }
      );

      if (product) {
        let items = product.productID;
        let all_items = await ProductCodeModel.findOne({ _id: id });
        if (all_items) {
          pages = Math.ceil(all_items.productID.length / limit);
        }
        if (items.length > 0) {
          res.json({
            message: "Successed",
            status: 200,
            data: items,
            pages: pages
          });
        } else {
          res.json({
            message: "Kh??ng t??m th???y item s???n ph???m n??o c???.",
            status: 400
          });
        }
      } else {
        res.json({ message: "Kh??ng t??m th???y s???n ph???m n??y.", status: 400 });
      }
    } catch (error) {
      res.json({ message: "Server error!", status: 500, error });
    }
  } else {
    res.json({ message: "B???n kh??ng c?? quy???n ??? ????y.", status: 400 });
  }
});

router.get("/item/:id", checkLogin, async (req, res) => {
  if (req.login_info.role === "admin") {
    let item_id = req.params.id;
    try {
      let item = await ProductModel.findOne({ _id: item_id });

      if (item) {
        res.json({ message: "Successed", status: 200, data: item });
      } else {
        res.json({ message: "Kh??ng t??m th???y item s???n ph???m n??y.", status: 400 });
      }
    } catch (error) {
      res.json({ message: "Server error!", status: 500, error });
    }
  } else {
    res.json({ message: "B???n kh??ng c?? quy???n ??? ????y.", status: 400 });
  }
});

router.post("/create", checkLogin, (req, res) => {
  if (req.login_info.role === "admin") {
    upload.array("product-image", 10)(req, res, async (err) => {
      if (err) {
        if (err == "ErrorType") {
          res.json({
            message:
              "H??nh t???i l??n kh??ng h??? tr???, ph???i l?? file *.png, *.jpg, *.gif.",
            status: 406,
          });
        } else {
          res.json({
            message: "L???i trong qu?? tr??nh upload h??nh ???nh.",
            status: 400,
          });
        }
      } else {
        if (req.files.length > 0) {
          let list_image = [];
          let list_detail = [];
          let list_category = [];
          for (x in req.files) {
            list_image.push("/public/upload/" + req.files[x].filename);
          }

          if (req.body["detail-title"]) {
            let detail_title = req.body["detail-title"];
            let detail_content = req.body["detail-content"];
            if (Array.isArray(detail_title)) {
              for (x in detail_title) {
                if (detail_title[x] && detail_content[x]) {
                  list_detail.push({
                    title: detail_title[x],
                    content: detail_content[x],
                  });
                }
              }
            } else {
              if (detail_title && detail_content) {
                list_detail.push({
                  title: detail_title,
                  content: detail_content,
                });
              }
            }
          }

          if (req.body.category) {
            let category_id = req.body.category;
            if (Array.isArray(category_id)) {
              list_category = category_id;
            } else {
              if (category_id) {
                list_category.push(category_id);
              }
            }
          }

          let title = req.body.title;
          let brand = req.body.brand;
          let description = req.body.description;
          let createDate = new Date();

          try {
            let create = await ProductCodeModel.create({
              productName: title,
              listImg: list_image,
              detail: list_detail,
              productID: [],
              categoryID: list_category,
              brand: brand,
              description: description,
              createDate: createDate,
              updateDate: createDate,
            });

            if (create) {
              res.json({
                message: "T???o s???n ph???m th??nh c??ng!",
                status: 200,
                data: create._id,
              });
            } else {
              DeleteFile(list_image);
              res.json({ message: "Kh??ng th??? t???o s???n ph???m.", status: 400 });
            }
          } catch (error) {
            DeleteFile(list_image);
            res.json({ message: "Server error!", status: 500, error });
          }
        } else {
          res.json({
            message: "Kh??ng c?? h??nh ???nh n??o ???????c t???i l??n c???.",
            status: 400,
          });
        }
      }
    });
  } else {
    res.json({ message: "B???n kh??ng c?? quy???n ??? ????y.", status: 400 });
  }
});

router.post("/create-product-item", checkLogin, async (req, res) => {
  if (req.login_info.role === "admin") {
    upload.single("thumbnail-product-item")(req, res, async (err) => {
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
          });
        }
      } else {
        if (req.file) {
          let thumb = "/public/upload/" + req.file.filename;
          try {
            let product_id = req.body.product_id;
            let product = await ProductCodeModel.findOne({ _id: product_id });

            if (product) {
              let color = req.body.color;
              let size = req.body.size;
              let price = req.body.price;
              let quantity = req.body.quantity;
              let createDate = new Date();

              let create = await ProductModel.create({
                color: color,
                size: size,
                price: price,
                quantity: quantity,
                thumb: thumb,
                productCode: product_id,
                createDate: createDate,
                updateDate: createDate
              });

              if (create) {
                await ProductCodeModel.updateOne(
                  { _id: product_id },
                  { $push: { productID: create._id } }
                );
                res.json({
                  message: "????ng item s???n ph???m th??nh c??ng!",
                  status: 200,
                  data: create._id
                });
              } else {
                DeleteFile([thumb]);
                res.json({
                  message: "Kh??ng th??? t???o item s???n ph???m tr??n.",
                  status: 400
                });
              }
            } else {
              DeleteFile([thumb]);
              res.json({
                message: "Kh??ng t??m ???????c s???n ph???m ????? t???o item tr??n.",
                status: 400
              });
            }
          } catch (error) {
            DeleteFile([thumb]);
            res.json({
              message: "Kh??ng t??m ???????c s???n ph???m ????? t???o item tr??n.",
              status: 400,
              error
            });
          }
        } else {
          res.json({
            message: "L???i upload h??nh, vui l??ng th??? l???i.",
            status: 400
          });
        }
      }
    });
  } else {
    res.json({ message: "B???n kh??ng c?? quy???n ??? ????y.", status: 400 });
  }
});

router.post("/edit", checkLogin, (req, res) => {
  if (req.login_info.role === "admin") {
    upload.array("product-image", 10)(req, res, async (err) => {
      if (err) {
        if (err == "ErrorType") {
          res.json({
            message:
              "H??nh t???i l??n kh??ng h??? tr???, ph???i l?? file *.png, *.jpg, *.gif.",
            status: 406
          });
        } else {
          res.json({
            message: "L???i trong qu?? tr??nh upload h??nh ???nh.",
            status: 400
          });
        }
      } else {
        let list_image = [];
        let list_detail = [];
        let list_category = [];

        if (req.files.length > 0) {
          for (x in req.files) {
            list_image.push("/public/upload/" + req.files[x].filename);
          }
        }

        if (req.body["detail-title"]) {
          let detail_title = req.body["detail-title"];
          let detail_content = req.body["detail-content"];
          if (Array.isArray(detail_title)) {
            for (x in detail_title) {
              if (detail_title[x] && detail_content[x]) {
                list_detail.push({
                  title: detail_title[x],
                  content: detail_content[x],
                });
              }
            }
          } else {
            if (detail_title && detail_content) {
              list_detail.push({
                title: detail_title,
                content: detail_content,
              });
            }
          }
        }

        if (req.body.category) {
          let category_id = req.body.category;
          if (Array.isArray(category_id)) {
            list_category = category_id;
          } else {
            if (category_id) {
              list_category.push(category_id);
            }
          }
        }

        let product_id = req.body.product_id;
        let title = req.body.title;
        let brand = req.body.brand;
        let description = req.body.description;
        let updateDate = new Date();

        try {
          let edit = await ProductCodeModel.findOneAndUpdate(
            { _id: product_id },
            {
              $set: {
                productName: title,
                detail: list_detail,
                categoryID: list_category,
                brand: brand,
                description: description,
                updateDate: updateDate
              },
              $push: { listImg: { $each: list_image } }
            },
            { returnOriginal: false }
          );

          if (edit) {
            res.json({
              message: "Update th??ng tin s???n ph???m th??nh c??ng!",
              status: 200,
              data: edit
            });
          } else {
            if (req.files.length > 0) {
              DeleteFile(list_image);
            }
            res.json({
              message: "Kh??ng th??? update th??ng tin s???n ph???m.",
              status: 400
            });
          }
        } catch (error) {
          if (req.files.length > 0) {
            DeleteFile(list_image);
          }
          res.json({ message: "Server error!", status: 500, error });
        }
      }
    });
  } else {
    res.json({ message: "B???n kh??ng c?? quy???n ??? ????y.", status: 400 });
  }
});

router.post("/edit-product-item", checkLogin, async (req, res) => {
  if (req.login_info.role === "admin") {
    upload.single("thumbnail-product-item")(req, res, async (err) => {
      if (err) {
        if (err == "ErrorType") {
          res.json({
            message:
              "H??nh ???nh t???i l??n kh??ng h??? tr???, ph???i l?? file *.png, *.jpg, *.gif.",
            status: 406
          });
        } else {
          res.json({
            message: "L???i trong qu?? tr??nh upload h??nh ???nh.",
            status: 400
          });
        }
      } else {
        try {
          let item_id = req.body.item_id;
          let color = req.body.color;
          let size = req.body.size;
          let price = req.body.price;
          let quantity = req.body.quantity;
          let thumb = "";
          let set_data = {};

          if (req.file) {
            thumb = "/public/upload/" + req.file.filename;
            set_data = {
              color: color,
              size: size,
              price: price,
              quantity: quantity,
              thumb: thumb
            };
          } else {
            set_data = {
              color: color,
              size: size,
              price: price,
              quantity: quantity
            };
          }

          let edit = await ProductModel.findOneAndUpdate(
            { _id: item_id },
            { $set: set_data },
            { returnOriginal: true }
          ); //return old data

          if (edit) {
            if (req.file) {
              DeleteFile([edit.thumb]); //Delete old thumb
            }
            res.json({ message: "S???a item s???n ph???m th??nh c??ng!", status: 200 });
          } else {
            if (req.file) {
              DeleteFile([thumb]); //Delete new thumb
            }
            res.json({
              message: "S???a item s???n ph???m kh??ng th??nh c??ng.",
              status: 400
            });
          }
        } catch (error) {
          DeleteFile([thumb]); //Delete new thumb
          res.json({ message: "Server error!", status: 500, error });
        }
      }
    });
  } else {
    res.json({ message: "B???n kh??ng c?? quy???n ??? ????y.", status: 400 });
  }
});

router.post("/delete", checkLogin, async (req, res) => {
  if (req.login_info.role === "admin") {
    try {
      let list_product = req.body["list_product[]"];
      let products = await ProductCodeModel.find({ _id: list_product });

      if (products.length > 0) {
        let total_list_image = [];
        let total_list_item = [];
        let total_list_thumb = [];
        for (x in products) {
          let list_image = products[x].listImg;
          let list_item = products[x].productID;
          let list_thumb = await GetListFile(list_item);

          total_list_image.push(...list_image);
          total_list_item.push(...list_item);
          total_list_thumb.push(...list_thumb);
        }

        let delete_products = await ProductCodeModel.deleteMany({
          _id: list_product,
        });

        if (delete_products.deletedCount > 0) {
          DeleteFile(total_list_image);
          DeleteFile(total_list_thumb);
          await ProductModel.deleteMany({ _id: total_list_item });
          res.json({ message: "Xo?? s???n ph???m th??nh c??ng!", status: 200 });
        } else {
          res.json({ message: "Xo?? s???n ph???m kh??ng th??nh c??ng.", status: 400 });
        }
      } else {
        res.json({ message: "Kh??ng t??m th???y s???n ph???m ????? xo??.", status: 400 });
      }
    } catch (error) {
      res.json({ message: "Server error!", status: 500, error });
    }
  } else {
    res.json({ message: "B???n kh??ng c?? quy???n ??? ????y.", status: 400 });
  }
});

router.post("/delete-product-item", checkLogin, async (req, res) => {
  if (req.login_info.role === "admin") {
    try {
      let product_id = req.body.product_id;
      let list_item = req.body["list_item[]"];
      //console.log(list_item);
      let list_file = await GetListFile(list_item);
      let update_product = await ProductCodeModel.updateOne(
        { _id: product_id },
        { $pull: { productID: { $in: list_item } } }
      );
      if (update_product.nModified) {
        let delete_item = await ProductModel.deleteMany({ _id: list_item });
        if (delete_item.deletedCount > 0) {
          DeleteFile(list_file);
          res.json({ message: "Xo?? item s???n ph???m th??nh c??ng!", status: 200 });
        } else {
          res.json({ message: "Xo?? item kh??ng th??nh c??ng.", status: 400 });
        }
      } else {
        res.json({
          message: "Qu?? tr??nh xo?? item s???n ph???m x???y ra l???i.",
          status: 400
        });
      }
    } catch (error) {
      res.json({ message: "Server error!", status: 500, error });
    }
  } else {
    res.json({ message: "B???n kh??ng c?? quy???n ??? ????y.", status: 400 });
  }
});

router.post("/delete-image", checkLogin, async (req, res) => {
  if (req.login_info.role === "admin") {
    try {
      let product_id = req.body.product_id;
      let image_url = req.body.image_url;
      let delete_image = await ProductCodeModel.updateOne(
        { _id: product_id },
        { $pull: { listImg: { $in: image_url } } }
      );
      if (delete_image.nModified) {
        DeleteFile([image_url]);
        res.json({
          message: "Xo?? h??nh ???nh c???a s???n ph???m th??nh c??ng!",
          status: 200
        });
      } else {
        res.json({
          message: "Kh??ng th??? xo?? h??nh ???nh c???a s???n ph???m!",
          status: 400
        });
      }
    } catch (error) {
      res.json({ message: "Server error!", status: 500, error });
    }
  } else {
    res.json({ message: "B???n kh??ng c?? quy???n ??? ????y.", status: 400 });
  }
});

router.get("/:id", getUserInfo, (req, res) => {
  try {
    res.render("pages/item-view", {
      id: req.params.id,
      login_info: req.login_info
    });
  } catch (err) {
    res.json({
      mess: "???? x???y ra l???i, vui l??ng th??? l???i",
      status: 500,
      err
    });
  }
});

router.post("/:productID", async (req, res) => {
  try {
    let data = await ProductCodeModel.findOne({
      _id: req.params.productID,
    })
      .populate("categoryID")
      .populate("productID")
      .populate("brand");
    res.json({
      mess: "lay data thanh cong",
      data,
      status: 200
    });
  } catch (err) {
    res.json({
      mess: "???? x???y ra l???i, vui l??ng th??? l???i",
      data: err,
      status: 500,
    });
    console.log(err);
  }
});

router.post("/related/:categoryID", async (req, res) => {
  try {
    let find = req.params.categoryID.split("-");
    find.pop();
    console.log(find);
    let data = await ProductCodeModel.find({
      categoryID: find,
    })
      .limit(20)
      .populate("productID");
    res.json({
      mess: "lay data thanh cong",
      data: data,
      status: 200
    });
  } catch (err) {
    console.log(err);
    res.json({
      mess: "???? x???y ra l???i, vui l??ng th??? l???i",
      err: "err",
      status: 500
    });
  }
});

module.exports = router;
