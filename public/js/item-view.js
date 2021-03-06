// get item

let id = $(".container").attr("id");
let selected;
let totalQuantity = 0;

//toastr
toastr.options = {
  closeButton: true,
  debug: false,
  newestOnTop: false,
  progressBar: true,
  positionClass: "toast-top-right",
  preventDuplicates: true,
  onclick: null,
  showDuration: "300",
  hideDuration: "1000",
  timeOut: "2000",
  extendedTimeOut: "1000",
  showEasing: "swing",
  hideEasing: "linear",
  showMethod: "fadeIn",
  hideMethod: "fadeOut",
};

$.ajax({
  type: "POST",
  url: "/product/" + id,
}).then((data) => {
  //append title
  $("title").text(data.data.productName);
  //append img
  for (let i = 0; i < data.data.listImg.length; i++) {
    $(".owl-one").append(`
    <div class="item">
      <img src="${data.data.listImg[i]}" alt="" />
    </div>
    `);
  }
  for (let i = 0; i < data.data.productID.length; i++) {
    $(".owl-one").append(`
    <div class="item ${data.data.productID[i]._id}">
      <img src="${data.data.productID[i].thumb}" alt="" />
    </div>
    `);
    totalQuantity = totalQuantity + data.data.productID[i].quantity;
  }
  //append totalQuantity
  $(".item-left").text(totalQuantity + " Sản phẩm có sẵn");
  // animation
  $(".owl-one").owlCarousel({
    loop: false,
    margin: 10,
    nav: true,
    responsive: {
      0: {
        items: 1,
      },
    },
  });
  for (let i = 0; i < data.data.productID.length; i++) {
    $("." + data.data.productID[i]._id)
      .parent()
      .attr("id", data.data.productID[i]._id);
  }

  // append data to html file
  var compareColor = [];
  var compareSize = [];
  var comparePrice = 1;
  var idColor = 0;
  var idSize = 0;
  $(".lowestprice").text((data.data.productID[0].price).toLocaleString('vi-VN', { style: 'currency', currency: 'VND'}));
  for (let i = 0; i < data.data.productID.length; i++) {
    // Hiển thị giá
    if (comparePrice > data.data.productID[i].price) {
      $(".lowestprice").text((data.data.productID[i].price).toLocaleString('vi-VN', { style: 'currency', currency: 'VND'}));
    }
    if (comparePrice <= data.data.productID[i].price) {
      $(".highestprice").text((data.data.productID[i].price).toLocaleString('vi-VN', { style: 'currency', currency: 'VND'}));
    }
    comparePrice = data.data.productID[i].price;

    // Button color
    let check = 1;
    for (let j = 0; j < compareColor.length; j++) {
      if (compareColor[j] == data.data.productID[i].color) {
        check = 0;
        break;
      }
    }
    if (check == 1) {
      $(".item-color .item-prop-element").append(
        `
          <button class="item-select-btn-color item-select-btn ${idColor}">${data.data.productID[i].color}</button>
        `
      );
      $(".item-select-btn-color." + idColor).on("click", function () {
        let thisEle = $(this);
        if (thisEle.hasClass("item-select-btn-inactive") == false) {
          $(".item-select-btn").removeClass("item-select-btn-inactive");
          $(".item-select-btn-color").removeClass("item-select-btn-choosed");
          thisEle.addClass("item-select-btn-choosed");
          let filter = data.data.productID.filter(function (a, b) {
            if (a.color == thisEle.text()) {
              return true;
            }
          });
          for (let i = 0; i < $(".item-select-btn-size").length; i++) {
            var check = 0;
            for (let j = 0; j < filter.length; j++) {
              if (filter[j].size == $(".item-select-btn-size." + i).text()) {
                check = 1;
                break;
              }
            }
            if (check == 0) {
              $(".item-select-btn-size." + i).addClass(
                "item-select-btn-inactive"
              );
              $(".item-select-btn-size." + i).removeClass(
                "item-select-btn-choosed"
              );
            }
          }
        }
      });
      idColor++;
    }
    compareColor.push(data.data.productID[i].color);

    // Button size
    check = 1;
    for (let j = 0; j < compareSize.length; j++) {
      if (compareSize[j] == data.data.productID[i].size) {
        check = 0;
        break;
      }
    }
    if (check == 1) {
      $(".item-size .item-prop-element").append(
        `
          <button class="item-select-btn-size item-select-btn ${idSize}">${data.data.productID[i].size}</button>
          `
      );
      $(".item-select-btn-size." + idSize).on("click", function () {
        var thisEle = $(this);
        if (thisEle.hasClass("item-select-btn-inactive") == false) {
          $(".item-select-btn").removeClass("item-select-btn-inactive");
          $(".item-select-btn-size").removeClass("item-select-btn-choosed");
          thisEle.addClass("item-select-btn-choosed");
          let filter = data.data.productID.filter(function (a, b) {
            if (a.size == thisEle.text()) {
              return true;
            }
          });
          for (let i = 0; i < $(".item-select-btn-color").length; i++) {
            var check = 0;
            for (let j = 0; j < filter.length; j++) {
              if (filter[j].color == $(".item-select-btn-color." + i).text()) {
                check = 1;
                break;
              }
            }
            if (check == 0) {
              $(".item-select-btn-color." + i).addClass(
                "item-select-btn-inactive"
              );
              $(".item-select-btn-color." + i).removeClass(
                "item-select-btn-choosed"
              );
            }
          }
        }
      });
      idSize++;
    }
    compareSize.push(data.data.productID[i].size);
  }

  //gắn id btn
  // Check giá cao nhất và thấp nhất
  if ($(".lowestprice").text() == $(".highestprice").text()) {
    $(".highestprice").text("");
    $(".spaceprice").text("");
  }

  // append detail and category
  $(".item-title").text(data.data.productName);
  $(".item-decs-p").text(data.data.description);
  for (let i = 0; i < data.data.categoryID.length; i++) {
    $(".item-detail").append(
      `
    <div class="item-detail-container">
      <span class="item-detail-title">Danh mục ${i + 1}</span>
      <span class="item-detail-content">${data.data.categoryID[i].categoryName}</span>
    </div>
    `
    );
    $(".item-category").text(data.data.categoryID[i].categoryName + " - ");
  }
  let categoryOldText = $(".item-category").text();
  $(".item-category").text(categoryOldText + data.data.productName);
  $(".item-detail").append(
    `
    <div class="item-detail-container">
      <span class="item-detail-title">Thương hiệu</span>
      <span class="item-detail-content">${data.data.brand.brandName}</span>
    </div>
    `
  );
  for (let i = 0; i < data.data.detail.length; i++) {
    $(".item-detail").append(
      `
      <div class="item-detail-container">
        <span class="item-detail-title">${data.data.detail[i].title}</span>
        <span class="item-detail-content">${data.data.detail[i].content}</span>
      </div>
      `
    );
  }

  //output hình ảnh và số lượng
  $(".item-select-btn").on("click", function () {
    let sizeEle = $(".item-select-btn-choosed.item-select-btn-size");
    let colorEle = $(".item-select-btn-choosed.item-select-btn-color");
    if ($(".item-select-btn-choosed").length == 2) {
      let outputImg = data.data.productID.find(function (a, b) {
        if (a.color == colorEle.text() && a.size == sizeEle.text()) {
          return a;
        }
      });
      var owlNumber = $(".owl-item").not($(".cloned"));
      for (let i = 0; i < owlNumber.length; i++) {
        let ele = owlNumber[i];
        if (ele.getAttribute("id") == outputImg._id) {
          $(".owl-one").trigger("to.owl.carousel", i);
          selected = ele.getAttribute("id");
          $(".item-left").text(outputImg.quantity + " Sản phẩm có sẵn");
        }
      }
    } else if ($(".item-select-btn-choosed").length == 1) {
      let oneButtonQuantity = 0;
      data.data.productID.find(function (a, b) {
        if (a.color == colorEle.text() || a.size == sizeEle.text()) {
          oneButtonQuantity = a.quantity + oneButtonQuantity;
          console.log(a.quantity);
        }
      });
      $(".item-left").text(oneButtonQuantity + " Sản phẩm có sẵn");
    } else {
      selected = "";
      $(".item-left").text(totalQuantity + " Sản phẩm có sẵn");
    }
  });

  //add to cart
  $(".item-add-to-cart").on("click", function () {
    let quantity = $(".item-quantity").val();
    if (quantity && selected) {
      $.ajax({
        url: "/user/addcart",
        type: "POST",
        data: {
          productID: selected,
          quantity: quantity,
        },
      })
        .then(function (data) {
          if (data.logged_in == false) {
            window.location.href = "/user/login";
          } else {
            loadCart();
            toastr[data.toastr](data.mess[0]);
          }
        })
        .catch(function (err) {
          console.log(err);
          toastr["error"]("Đã xảy ra lỗi, vui lòng thử lại");
        });
    } else {
      toastr["warning"]("Vui lòng chọn phân loại và nhập số lượng");
    }
  });

  $.ajax({
    type: "GET",
    url: "/product/showProduct?limit=12&similar=" + id,
  })
    .then(function (data) {
      if(data.status == 200){
        for (let i = 0; i < data.data.length; i++) {
          let price = (data.data[i].min)? ((data.data[i].min != data.data[i].max)? `${(data.data[i].min).toLocaleString('vi-VN', { style: 'currency', currency: 'VND'})} - ${(data.data[i].max).toLocaleString('vi-VN', { style: 'currency', currency: 'VND'})}`: (data.data[i].min).toLocaleString('vi-VN', { style: 'currency', currency: 'VND'})) : (0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND'});
          let append = `
        <a href="/product/${data.data[i]._id}" class="owl-carousel-item">
          <div class="carousel-item-product">
            <img src="${data.data[i].listImg[0]}" alt="" class="carousel-item-img"/>
          </div>
          <div class="carousel-content-container">
            <span class="carousel-title">${data.data[i].productName}</span>
            <div class="carousel-price">${price}</div>
          </div>
        </a>
        `;
          $(".owl-two").append(append);
        }
        $(".owl-two").owlCarousel({
          loop: true,
          margin: 10,
          nav: true,
          responsive: {
            0: {
              items: 1,
            },
            360: {
              items: 2,
            },
            780: {
              items: 3,
            },
            1024: {
              items: 4,
            },
            1200: {
              items: 6,
            },
          },
        });
      }
    })
    .catch(function (err) {
      toastr["error"]("Đã xảy ra lỗi, vui lòng thử lại");
      console.log(err);
    });
});
