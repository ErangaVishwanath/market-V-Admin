import React from "react";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import HomeIcon from "@mui/icons-material/Home";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { emphasize, styled } from "@mui/material/styles";
import Chip from "@mui/material/Chip";
import { useContext, useEffect, useState } from "react";
import { FaCloudUploadAlt } from "react-icons/fa";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import {
  deleteData,
  deleteImages,
  editData,
  fetchDataFromApi,
  postData,
  uploadImage,
} from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { FaRegImages } from "react-icons/fa";
import { MyContext } from "../../App";

import CircularProgress from "@mui/material/CircularProgress";
import { IoCloseSharp } from "react-icons/io5";

import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";

//breadcrumb code
const StyledBreadcrumb = styled(Chip)(({ theme }) => {
  const backgroundColor =
    theme.palette.mode === "light"
      ? theme.palette.grey[100]
      : theme.palette.grey[800];
  return {
    backgroundColor,
    height: theme.spacing(3),
    color: theme.palette.text.primary,
    fontWeight: theme.typography.fontWeightRegular,
    "&:hover, &:focus": {
      backgroundColor: emphasize(backgroundColor, 0.06),
    },
    "&:active": {
      boxShadow: theme.shadows[1],
      backgroundColor: emphasize(backgroundColor, 0.12),
    },
  };
});

const AddBanner = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formFields, setFormFields] = useState({
    images: [],
    catName: null,
    catId: null,
    subCat: null,
    subCatId: null,
    subCatName: null,
  });

  const [previews, setPreviews] = useState([]);
  const [categoryVal, setcategoryVal] = useState(null);
  const [subCatVal, setSubCatVal] = useState(null);
  const [subCatData, setSubCatData] = useState([]);

  const formdata = new FormData();

  const history = useNavigate();

  const context = useContext(MyContext);

  useEffect(() => {
    // Initial cleanup of uploaded images
    fetchDataFromApi("/api/imageUpload")
      .then(async (res) => {
        if (Array.isArray(res)) {
          const deletionPromises = [];
          res.forEach((item) => {
            if (Array.isArray(item?.images)) {
              item.images.forEach((img) => {
                deletionPromises.push(
                  deleteImages(`/api/homeBanner/deleteImage?img=${img}`)
                    .then(() => deleteData("/api/imageUpload/deleteAllImages"))
                    .catch((err) =>
                      console.error(`Failed to delete image ${img}:`, err)
                    )
                );
              });
            }
          });
          await Promise.all(deletionPromises);
        }
      })
      .catch((error) => {
        console.error("Error during initial image cleanup:", error);
      });
  }, []);

  useEffect(() => {
    // Process subcategories from category data
    if (Array.isArray(context.catData?.categoryList)) {
      const subCatArr = context.catData.categoryList.reduce((acc, cat) => {
        if (Array.isArray(cat?.children)) {
          return [...acc, ...cat.children];
        }
        return acc;
      }, []);

      setSubCatData(subCatArr);
    }
  }, [context.catData]);

  const onChangeFile = async (e, apiEndPoint) => {
    try {
      const files = e.target.files;
      setUploading(true);

      // Validate and append files
      for (let i = 0; i < files.length; i++) {
        if (
          files[i] &&
          (files[i].type === "image/jpeg" ||
            files[i].type === "image/jpg" ||
            files[i].type === "image/png" ||
            files[i].type === "image/webp")
        ) {
          formdata.append("images", files[i]);
        } else {
          context.setAlertBox({
            open: true,
            error: true,
            msg: "Please select a valid JPG or PNG image file.",
          });
          setUploading(false);
          return false;
        }
      }

      // Upload images and process response
      await uploadImage(apiEndPoint, formdata);
      const response = await fetchDataFromApi("/api/imageUpload");

      if (Array.isArray(response)) {
        const newImages = [];

        // Collect all image URLs
        response.forEach((item) => {
          if (Array.isArray(item?.images)) {
            item.images.forEach((img) => {
              newImages.push(img);
            });
          }
        });

        // Filter unique images
        const uniqueImages = newImages.filter(
          (item, index) => newImages.indexOf(item) === index
        );

        // Update previews with both existing and new images
        setPreviews((prev) => [...prev, ...uniqueImages]);

        // Cleanup uploaded images
        try {
          const cleanupRes = await fetchDataFromApi("/api/imageUpload");
          if (Array.isArray(cleanupRes)) {
            await Promise.all(
              cleanupRes.flatMap((item) =>
                Array.isArray(item?.images)
                  ? item.images.map((img) =>
                      deleteImages(
                        `/api/homeBanner/deleteImage?img=${img}`
                      ).then(() =>
                        deleteData("/api/imageUpload/deleteAllImages")
                      )
                    )
                  : []
              )
            );
          }
        } catch (cleanupError) {
          console.error("Error during cleanup:", cleanupError);
        }

        setUploading(false);
        context.setAlertBox({
          open: true,
          error: false,
          msg: "Images Uploaded!",
        });
      } else {
        throw new Error("Invalid response format from image upload");
      }
    } catch (error) {
      console.error("Error in image upload:", error);
      setUploading(false);
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Failed to upload images. Please try again.",
      });
    }
  };

  const removeImg = async (index, imgUrl) => {
    try {
      await deleteImages(`/api/banners/deleteImage?img=${imgUrl}`);
      setPreviews((prev) => prev.filter((_, i) => i !== index));
      context.setAlertBox({
        open: true,
        error: false,
        msg: "Image Deleted!",
      });
    } catch (error) {
      console.error("Error deleting image:", error);
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Failed to delete image",
      });
    }
  };

  const handleChangeCategory = (event) => {
    setcategoryVal(event.target.value);
    setFormFields((prev) => ({
      ...prev,
      category: event.target.value,
    }));
  };

  const selectCat = (cat, id) => {
    setFormFields((prev) => ({
      ...prev,
      catName: cat,
      catId: id,
    }));
  };

  const selectSubCat = (subCat, id) => {
    setFormFields((prev) => ({
      ...prev,
      subCat: subCat,
      subCatName: subCat,
      subCatId: id,
    }));
  };

  const handleChangeSubCategory = (event) => {
    setSubCatVal(event.target.value);
  };

  const addHomeBanner = async (e) => {
    e.preventDefault();

    if (previews.length === 0) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please upload at least one image",
      });
      return false;
    }

    try {
      setIsLoading(true);

      const bannerData = {
        ...formFields,
        images: [...previews],
      };

      await postData("/api/banners/create", bannerData);
      await deleteData("/api/imageUpload/deleteAllImages");

      context.fetchCategory();
      history("/banners");

      context.setAlertBox({
        open: true,
        error: false,
        msg: "Banner created successfully!",
      });
    } catch (error) {
      console.error("Error creating banner:", error);
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Failed to create banner",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="right-content w-100">
        <div className="card shadow border-0 w-100 flex-row p-4 mt-2">
          <h5 className="mb-0">Add Home Slide Banner</h5>
          <Breadcrumbs aria-label="breadcrumb" className="ml-auto breadcrumbs_">
            <StyledBreadcrumb
              component="a"
              href="#"
              label="Dashboard"
              icon={<HomeIcon fontSize="small" />}
            />

            <StyledBreadcrumb
              component="a"
              label="Home Slide Banners"
              href="#"
              deleteIcon={<ExpandMoreIcon />}
            />
            <StyledBreadcrumb
              label="Add Home Slide Banner"
              deleteIcon={<ExpandMoreIcon />}
            />
          </Breadcrumbs>
        </div>

        <form className="form" onSubmit={addHomeBanner}>
          <div className="row">
            <div className="col-sm-9">
              <div className="card p-4 mt-0">
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <h6>CATEGORY</h6>
                      <Select
                        value={categoryVal}
                        onChange={handleChangeCategory}
                        displayEmpty
                        inputProps={{ "aria-label": "Without label" }}
                        className="w-100"
                      >
                        <MenuItem value="">
                          <em value={null}>None</em>
                        </MenuItem>
                        {context.catData?.categoryList?.length !== 0 &&
                          context.catData?.categoryList?.map((cat, index) => {
                            return (
                              <MenuItem
                                className="text-capitalize"
                                value={cat._id}
                                key={index}
                                onClick={() => selectCat(cat.name, cat._id)}
                              >
                                {cat.name}
                              </MenuItem>
                            );
                          })}
                      </Select>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="form-group">
                      <h6>SUB CATEGORY</h6>
                      <Select
                        value={subCatVal}
                        onChange={handleChangeSubCategory}
                        displayEmpty
                        inputProps={{ "aria-label": "Without label" }}
                        className="w-100"
                      >
                        <MenuItem value="">
                          <em value={null}>None</em>
                        </MenuItem>
                        {subCatData?.length !== 0 &&
                          subCatData?.map((subCat, index) => {
                            return (
                              <MenuItem
                                className="text-capitalize"
                                value={subCat._id}
                                key={index}
                                onClick={() =>
                                  selectSubCat(subCat.name, subCat._id)
                                }
                              >
                                {subCat.name}
                              </MenuItem>
                            );
                          })}
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="imagesUploadSec">
                  <h5 className="mb-4">Media And Published</h5>

                  <div className="imgUploadBox d-flex align-items-center">
                    {previews?.length !== 0 &&
                      previews?.map((img, index) => {
                        return (
                          <div className="uploadBox" key={index}>
                            <span
                              className="remove"
                              onClick={() => removeImg(index, img)}
                            >
                              <IoCloseSharp />
                            </span>
                            <div className="box">
                              <LazyLoadImage
                                alt={"image"}
                                effect="blur"
                                className="w-100"
                                src={img}
                              />
                            </div>
                          </div>
                        );
                      })}

                    <div className="uploadBox">
                      {uploading === true ? (
                        <div className="progressBar text-center d-flex align-items-center justify-content-center flex-column">
                          <CircularProgress />
                          <span>Uploading...</span>
                        </div>
                      ) : (
                        <>
                          <input
                            type="file"
                            multiple
                            onChange={(e) =>
                              onChangeFile(e, "/api/banners/upload")
                            }
                            name="images"
                          />
                          <div className="info">
                            <FaRegImages />
                            <h5>image upload</h5>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <br />

                  <Button
                    type="submit"
                    className="btn-blue btn-lg btn-big w-100"
                  >
                    <FaCloudUploadAlt /> &nbsp;{" "}
                    {isLoading === true ? (
                      <CircularProgress color="inherit" className="loader" />
                    ) : (
                      "PUBLISH AND VIEW"
                    )}{" "}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default AddBanner;
