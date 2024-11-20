import Post from "../models/post.js";
import generateCode from "../ultis/generateCode.js"
import generateDate from "../ultis/generateDate.js"
import Attribute from "../models/attribute.js";
import moment from "moment";
import Overview from "../models/overview.js"
import Image from "../models/image.js";

export const getPostsService = () =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await Post.find()
        .populate({
          path: "imagesId",
          foreignField: "id", // Match by 'id'
          select: "id image", // Select specific fields
          strictPopulate: false,
        })
        .populate({
          path: "attributesId",
          foreignField: "id", // Match by 'id'
          select: "id price acreage published hashtag",
          strictPopulate: false,
        })
        .populate({
          path: "userId",
          foreignField: "id", // Match by 'id'
          select: "id name zalo phone",
          strictPopulate: false,
        })
        .select("id title star address description") // Select Post fields
        .lean();

      resolve({
        err: response ? 0 : 1,
        msg: response ? "OK" : "Getting posts is failed.",
        response,
      });
    } catch (error) {
      reject(error);
    }
  });

export const getPostById = (pid) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await Post.findOne({ id: pid }) // Query by custom 'id'
        .populate({
          path: "imagesId",
          foreignField: "id", // Match by 'id'
          select: "id image",
          strictPopulate: false,
        })
        .populate({
          path: "attributesId",
          foreignField: "id",
          select: "id price acreage published hashtag",
          strictPopulate: false,
        })
        .populate({
          path: "userId",
          foreignField: "id",
          select: "id name zalo phone",
          strictPopulate: false,
        })
        .populate({
          path: "overviewId",
          foreignField: "id",
          strictPopulate: false,
        })
        .populate({
          path: "labelCode",
          foreignField: "code",
          strictPopulate: false,
        })
        .populate({
          path: "votes",
          populate: {
            path: "userData",
            foreignField: "id",
            select: "id name avatar",
            strictPopulate: false,
          },
          strictPopulate: false,
        })
        .populate({
          path: "comments",
          populate: {
            path: "commentator",
            foreignField: "id",
            select: "id name avatar",
            strictPopulate: false,
          },
          strictPopulate: false,
        })
        .lean();

      resolve({
        err: response ? 0 : 1,
        msg: response ? "OK" : "Getting post by ID failed.",
        response,
      });
    } catch (error) {
      reject(error);
    }
  });

export const getPostsLimitService = async (
  page,
  { limitPost, order, ...query },
  { priceNumber, areaNumber }
) => {
  try {
    let offset = !page || +page <= 1 ? 0 : +page - 1;
    const limit = +limitPost || +process.env.LIMIT;
    const queries = { ...query };

    if (priceNumber)
      queries.priceNumber = { $gte: priceNumber[0], $lte: priceNumber[1] };
    if (areaNumber)
      queries.areaNumber = { $gte: areaNumber[0], $lte: areaNumber[1] };
    // if (order) queries.order = order;

    const response = await Post.find(queries)
      .skip(offset * limit)
      .limit(limit)
      .populate({
        path: "imagesId",
        foreignField: "id", // Match by 'id'
        select: "id image", // Select specific fields
        strictPopulate: false,
      })
      .populate({
        path: "attributesId",
        foreignField: "id",
        select: "id price acreage published hashtag",
        strictPopulate: false,
      })
      .populate({
        path: "userId",
        select: "name zalo phone",
        foreignField: "id", // Match by 'id'
        strictPopulate: false,
      })
      .populate({
        path: "overviewsId",
        foreignField: "id", // Match by 'id'
        strictPopulate: false,
      })
      .populate({
        path: "labelCode",
        select: "-createdAt -updatedAt",
        foreignField: "id", // Match by 'id'
        strictPopulate: false,
      })
      .populate({
        path: "categoryCode",
        select: "code value",
        foreignField: "id", // Match by 'id'
        strictPopulate: false,
      })
      .lean();
    // { path: "lovers", select: "id" },
    //   .sort(order ? { createdAt: order } : { createdAt: -1 });

    return {
      err: response ? 0 : 1,
      msg: response ? "OK" : "Getting posts failed.",
      response,
    };
  } catch (error) {
    throw error;
  }
};

// Service: Get new posts
export const getNewPostService = async () => {
  try {
    const response = await Post.find({})
      .sort({ createdAt: -1 })
      .limit(+process.env.LIMIT)
      .populate({
        path: "imagesId",
        foreignField: "id", // Match by 'id'
        select: "id image", // Select specific fields
        strictPopulate: false,
      })
      .populate({
        path: "attributesId",
        foreignField: "id",
        select: "id price acreage published hashtag",
        strictPopulate: false,
      }).lean()
      .select("id title star createdAt");

    return {
      err: response ? 0 : 1,
      msg: response ? "OK" : "Getting posts failed.",
      response,
    };
  } catch (error) {
    throw error;
  }
};
import makeid from "uniqid";
// Service: Create new post
  export const createNewPostService = async (body, userId) => {
    try {
      const attributesId = makeid();
      const imagesId = makeid();
      const overviewId = makeid();
      const labelCode = generateCode(body.label);
      const hashtag = `#${Math.floor(Math.random() * Math.pow(10, 6))}`;
      const currentDate = generateDate();

      const newPost = new Post({
        id: makeid(),
        title: body.title,
        expired: body.expired,
        labelCode,
        address: body.address || null,
        attributesId,
        categoryCode: body.categoryCode,
        description: JSON.stringify(body.description) || null,
        userId,
        overviewId,
        imagesId,
        areaCode: body.areaCode || null,
        priceCode: body.priceCode || null,
        provinceCode: body?.province?.includes("Thành phố")
          ? generateCode(body?.province?.replace("Thành phố ", ""))
          : generateCode(body?.province?.replace("Tỉnh ", "")) || null,
        priceNumber: body.priceNumber,
        areaNumber: body.areaNumber,
      });

      await newPost.save();

      const newAttribute = new Attribute({
        id: attributesId,
        price:
          +body.priceNumber < 1
            ? `${+body.priceNumber * 1000000} đồng/tháng`
            : `${body.priceNumber} triệu/tháng`,
        acreage: `${body.areaNumber} m2`,
        published: moment(new Date()).format("DD/MM/YYYY"),
        hashtag,
      });

      await newAttribute.save();

      const newImage = new Image({
        id: imagesId,
        image: JSON.stringify(body.images),
      });

      await newImage.save();

      const newOverview = new Overview({
        id: overviewId,
        code: hashtag,
        area: body.label,
        type: body?.category,
        target: body?.target,
        bonus: "Tin thường",
        created: currentDate.today,
        expired: currentDate.expireDay,
      });

      await newOverview.save();

      const newProvince = await Province.findOneAndUpdate(
        { value: body?.province?.replace("Thành phố ", "") },
        { value: body?.province?.replace("Tỉnh ", "") },
        { upsert: true, new: true }
      );

      const newLabel = await Label.findOneAndUpdate(
        { code: labelCode },
        { code: labelCode, value: body.label },
        { upsert: true, new: true }
      );

      return {
        err: 0,
        msg: "OK",
      };
    } catch (error) {
      throw error;
    }
  };

// Service: Update post
export const updatePost = async ({
  postId,
  overviewId,
  imagesId,
  attributesId,
  ...body
}) => {
  try {
    const labelCode = generateCode(body.label);

    await Post.updateOne(
      { _id: postId },
      {
        title: body.title,
        labelCode,
        address: body.address || null,
        categoryCode: body.categoryCode,
        description: JSON.stringify(body.description) || null,
        areaCode: body.areaCode || null,
        priceCode: body.priceCode || null,
        provinceCode: body?.province?.includes("Thành phố")
          ? generateCode(body?.province?.replace("Thành phố ", ""))
          : generateCode(body?.province?.replace("Tỉnh ", "")) || null,
        priceNumber: body.priceNumber,
        areaNumber: body.areaNumber,
      }
    );

    await Attribute.updateOne(
      { _id: attributesId },
      {
        price:
          +body.priceNumber < 1
            ? `${+body.priceNumber * 1000000} đồng/tháng`
            : `${body.priceNumber} triệu/tháng`,
        acreage: `${body.areaNumber} m2`,
      }
    );

    await Image.updateOne(
      { _id: imagesId },
      {
        image: JSON.stringify(body.images),
      }
    );

    await Overview.updateOne(
      { _id: overviewId },
      {
        area: body.label,
        type: body?.category,
        target: body?.target,
      }
    );

    await Province.findOneAndUpdate(
      { value: body?.province?.replace("Thành phố ", "") },
      { value: body?.province?.replace("Tỉnh ", "") },
      { upsert: true, new: true }
    );

    await Label.findOneAndUpdate(
      { code: labelCode },
      { code: labelCode, value: body.label },
      { upsert: true, new: true }
    );

    return {
      err: 0,
      msg: "Updated",
    };
  } catch (error) {
    throw error;
  }
};

// Service: Delete post
export const deletePost = async (postId) => {
  try {
    const response = await Post.deleteOne({ _id: postId });

    return {
      err: response.deletedCount > 0 ? 0 : 1,
      msg: response.deletedCount > 0 ? "Delete" : "No post delete.",
    };
  } catch (error) {
    throw error;
  }
};

// Service: Get wishlist
export const getWishlist = async ({ uid }) => {
  try {
    const response = await Wishlist.find({ uid }).populate({
      path: "wishlistData",
      populate: [
        { path: "images", select: "image" },
        { path: "attributes", select: "price acreage published hashtag" },
        { path: "user", select: "name zalo phone" },
        { path: "overviews" },
        { path: "labelData", select: "-createdAt -updatedAt" },
        { path: "category", select: "code value" },
        { path: "lovers", select: "id" },
      ],
    });

    return {
      err: response ? 0 : 1,
      msg: response ? "OK" : "Getting posts failed.",
      response,
    };
  } catch (error) {
    throw error;
  }
};

// Service: Report post
export const reportPost = async ({ pid, reason, title, uid }) => {
  try {
    const response = await Report.create({
      pid,
      reason,
      title,
      uid,
    });

    return {
      err: response ? 0 : 1,
      data: response
        ? "Đã gửi báo cáo vi phạm cho bài đăng này"
        : "Something went wrong",
    };
  } catch (error) {
    throw error;
  }
};
// Service: Expired posts
export const expiredPostService = async () => {
  try {
    const currentDate = moment().toDate();

    // Tìm các bài đăng đã hết hạn
    const expiredPosts = await Post.find({
      expired: { $lt: currentDate }, // So sánh với ngày hiện tại
    })
      .populate([
        { path: "images", select: "image" },
        { path: "attributes", select: "price acreage published hashtag" },
        { path: "user", select: "name zalo phone" },
        { path: "overviews" },
        { path: "labelData", select: "-createdAt -updatedAt" },
        { path: "category", select: "code value" },
        { path: "lovers", select: "id" },
      ])
      .sort({ expired: -1 }); // Sắp xếp theo ngày hết hạn

    return {
      err: expiredPosts ? 0 : 1,
      msg: expiredPosts ? "OK" : "No expired posts found.",
      response: expiredPosts,
    };
  } catch (error) {
    throw error;
  }
};

// Service: Get post by ID
export const getPostByIdService = async (postId) => {
  try {
    const post = await Post.findById(postId)
      .populate([
        { path: "images", select: "image" },
        { path: "attributes", select: "price acreage published hashtag" },
        { path: "user", select: "name zalo phone" },
        { path: "overviews" },
        { path: "labelData", select: "-createdAt -updatedAt" },
        { path: "category", select: "code value" },
        { path: "lovers", select: "id" },
      ])
      .exec();

    if (!post) {
      return {
        err: 1,
        msg: "Post not found.",
      };
    }

    return {
      err: 0,
      msg: "OK",
      response: post,
    };
  } catch (error) {
    throw error;
  }
};

// Service: Add post to wishlist
export const addToWishlist = async (userId, postId) => {
  try {
    const post = await Post.findById(postId);
    if (!post) {
      return {
        err: 1,
        msg: "Post not found.",
      };
    }

    // Kiểm tra xem bài viết đã có trong wishlist chưa
    const existingWishlist = await Wishlist.findOne({ uid: userId });
    if (existingWishlist) {
      const isPostAlreadyInWishlist = existingWishlist.wishlistData.some(
        (post) => post.toString() === postId
      );
      if (isPostAlreadyInWishlist) {
        return {
          err: 1,
          msg: "Post is already in wishlist.",
        };
      }
    }

    // Nếu chưa có thì thêm bài viết vào wishlist
    const updatedWishlist = await Wishlist.findOneAndUpdate(
      { uid: userId },
      { $push: { wishlistData: postId } },
      { new: true, upsert: true }
    );

    return {
      err: 0,
      msg: "Post added to wishlist.",
      response: updatedWishlist,
    };
  } catch (error) {
    throw error;
  }
};

// Service: Remove post from wishlist
export const removeFromWishlist = async (userId, postId) => {
  try {
    const post = await Post.findById(postId);
    if (!post) {
      return {
        err: 1,
        msg: "Post not found.",
      };
    }

    // Xóa bài viết khỏi wishlist
    const updatedWishlist = await Wishlist.findOneAndUpdate(
      { uid: userId },
      { $pull: { wishlistData: postId } },
      { new: true }
    );

    if (!updatedWishlist) {
      return {
        err: 1,
        msg: "Wishlist not found.",
      };
    }

    return {
      err: 0,
      msg: "Post removed from wishlist.",
      response: updatedWishlist,
    };
  } catch (error) {
    throw error;
  }
};

// Service: Get expired posts for notifications (or auto-deletion)
export const expiredPostNotificationService = async () => {
  try {
    const currentDate = moment().toDate();
    const expiredPosts = await Post.find({
      expired: { $lt: currentDate },
      status: { $ne: "archived" }, // Chỉ chọn những bài đăng chưa được lưu trữ
    });

    return {
      err: expiredPosts.length > 0 ? 0 : 1,
      msg: expiredPosts.length > 0 ? "OK" : "No expired posts.",
      response: expiredPosts,
    };
  } catch (error) {
    throw error;
  }
};
