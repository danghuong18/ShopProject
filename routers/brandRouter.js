const router = require("express").Router();
const BrandModel = require("../model/brandModel");
const multer = require("multer");
const fs = require('fs');
const path = require("path");
const { checkLogin } = require("../middleWare/checkAuth");

async function GetListFile(list_id = []){
    list_file = []
    try {
        let brands = await BrandModel.find({_id: list_id});
        if(brands.length > 0){
            for(x in brands){
                list_file.push(brands[x].logo);
            }
        }
    } catch (error) {}

    return list_file;
}

function DeleteFile(list_file = []){
    for(x in list_file){
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
            cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
        }else{
            cb("ErrorType");
        }
    }
});

const upload = multer({storage: storage});

router.get("/", checkLogin, async (req, res)=> {
    if(req.login_info.role === "admin"){
        try {
            let sort = req.query.sort;
            let limit = req.query.limit*1;
            let skip = (req.query.page - 1)*limit;
            let pages = 1;
            let sortby = {};
        
            if(sort == "name-az"){
                sortby = {brandName: 1};
            }else if(sort == "name-za"){
                sortby = {brandName: -1};
            }else if(sort == "date-desc"){
                sortby = {createDate: -1};
            }else if(sort == "date-asc"){
                sortby = {createDate: 1};
            }else{
                sortby = {createDate: -1};
            }
    
            let brands = await BrandModel.find({}).skip(skip).limit(limit).sort(sortby);
            let all_brands = await BrandModel.find({});
            if(all_brands.length > 0){
                pages = Math.ceil(all_brands.length/limit);
            }
            if(brands.length > 0){
                res.json({message: "Succcessed", status: 200, data: brands, pages: pages});
            }else{
                res.json({message: "Kh??ng c?? th????ng hi???u n??o ????? hi???n th??? c???.", status: 400});
            }
        } catch(error){
            res.json({message: "Server error!", status: 500, error});
        }
    }else{
        res.json({message: "B???n kh??ng c?? quy???n ??? ????y.", status: 400});
    }
});

router.post("/create", checkLogin, async (req, res)=>{
    if(req.login_info.role === "admin"){
        upload.single("brandlogo")(req, res, async (err)=>{
            if (err) {
                if(err == "ErrorType"){
                    res.json({message: "H??nh ???nh t???i l??n kh??ng h??? tr???, ph???i l?? file *.png, *.jpg, *.gif.", status: 406});
                }else{
                    res.json({message: "L???i trong qu?? tr??nh upload h??nh ???nh.", status: 400});
                }
            }else{
                if(req.file){
                    let logo = "/public/upload/" + req.file.filename;
                    try {
                        let title = req.body.title;
                        let createDate = new Date();
    
                        let check_exist =  await BrandModel.findOne({brandName: title});
                        if(check_exist){
                            DeleteFile([logo]);
                            res.json({message: "Th????ng hi???u ???? t???n t???i, vui l??ng ?????t l???i t??n kh??c.", status: 400});
                        }else{
                            let create = await BrandModel.create({brandName: title, logo: logo, createDate: createDate, updateDate: createDate});
                            if(create){
                                res.json({message: "T???o th????ng hi???u th??nh c??ng!", status: 200});
                            }else{
                                DeleteFile([logo]);
                                res.json({message: "Kh??ng th??? t???o th????ng hi???u.", status: 400});
                            }
                        }
                    } catch (error) {
                        DeleteFile([logo]);
                        res.json({message: "Server error!", status: 500, error});
                    }
                }else{
                    res.json({message: "L???i upload h??nh, vui l??ng th??? l???i.", status: 500});
                }
            }
          });
    }else{
        res.json({message: "B???n kh??ng c?? quy???n ??? ????y.", status: 400});
    }
});

router.post("/edit", checkLogin, async (req, res)=>{
    if(req.login_info.role === "admin"){
        upload.single("brandlogo")(req, res, async (err)=>{
            if (err) {
                if(err == "ErrorType"){
                    res.json({message: "H??nh ???nh t???i l??n kh??ng h??? tr???, ph???i l?? file *.png, *.jpg, *.gif.", status: 406});
                }else{
                    res.json({message: "L???i trong qu?? tr??nh upload h??nh ???nh.", status: 400});
                }
            }else{
                let logo = "";
    
                if(req.file) {
                    logo = "/public/upload/" + req.file.filename;
                }
    
                try {
    
                    let updateDate = new Date();
                    let id = req.body.id;
                    let title = req.body.title;
                    let list_file = await GetListFile([id]);
                    let set_data = {};
    
                    let check_exist = await BrandModel.findOne({brandName: title});
    
                    if(check_exist){
                        if(check_exist._id != id){
                            if(req.file) {
                                DeleteFile([logo]); //Delete image has uploaded
                            }
                            res.json({message: "Th????ng hi???u ???? t???n t???i, vui l??ng ?????t l???i t??n kh??c.", status: 400});
                        }else{
                            if(req.file) {
                                set_data = {logo: logo, updateDate: updateDate};
                                let edit = await BrandModel.updateOne({_id: id}, {$set: set_data});
                                if(edit.nModified){
                                    DeleteFile(list_file); //Delete image has replaced
                                    res.json({message: "S???a th????ng hi???u th??nh c??ng!", status: 200});
                                }else{
                                    DeleteFile([logo]); //Delete image has uploaded
                                    res.json({message: "Kh??ng th??? s???a th????ng hi???u.", status: 400});
                                }
                            }else{
                                res.json({message: "T??n danh m???c tr??ng v???i t??n ban ?????u.", status: 400});
                            }
                        }
    
                    }else{
                        if(req.file) {
                            set_data = { brandName: title, logo: logo, updateDate: updateDate};
                        }else{
                            set_data = { brandName: title, updateDate: updateDate};
                        }
        
                        let edit = await BrandModel.updateOne({_id: id}, {$set: set_data});
                        if(edit.nModified){
                            if(req.file) {
                                DeleteFile(list_file); //Delete image has replaced
                            }
                            res.json({message: "S???a th????ng hi???u th??nh c??ng!", status: 200});
                        }else{
                            if(req.file) {
                                DeleteFile([logo]); //Delete image has uploaded
                            }
                            res.json({message: "Kh??ng th??? s???a th????ng hi???u.", status: 400});
                        }
                    }
                } catch (error) {
                    if(req.file) {
                        DeleteFile([logo]); //Delete image has uploaded
                    }
                    res.json({message: "Server error!", status: 500, error});
                }
            }
          });
    }else{
        res.json({message: "B???n kh??ng c?? quy???n ??? ????y.", status: 400});
    }
});

router.post("/delete", checkLogin, async (req, res)=>{
    if(req.login_info.role === "admin"){
        try {
            let list_item = req.body['list_item[]'];
            let list_file = await GetListFile(list_item);
    
            let delete_item = await BrandModel.deleteMany({_id: list_item});
            if(delete_item.deletedCount > 0){
                DeleteFile(list_file);
                res.json({message: "Xo?? th????ng hi???u th??nh c??ng!", status: 200});
            }else{
                res.json({message: "Kh??ng th??? xo?? th????ng hi???u.", status: 400});
            }
        } catch (error) {
            res.json({message: "Server error!", status: 500, error});
        }
    }else{
        res.json({message: "B???n kh??ng c?? quy???n ??? ????y.", status: 400});
    }
});

module.exports = router;