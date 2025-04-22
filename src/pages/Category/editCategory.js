import React from "react";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import HomeIcon from "@mui/icons-material/Home";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { emphasize, styled } from "@mui/material/styles";
import Chip from "@mui/material/Chip";
import { useContext, useEffect, useState } from "react";
import { FaCloudUploadAlt } from "react-icons/fa";
import Button from "@mui/material/Button";
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
import { useParams } from "react-router-dom";

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

const EditCategory = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formFields, setFormFields] = useState({
    name: "",
    images: [],
    color: "",
  });

  const [previews, setPreviews] = useState([]);

  const [category, setcategory] = useState([]);

  let { id } = useParams();

  const formdata = new FormData();

  const history = useNavigate();

  const context = useContext(MyContext);

  useEffect(() => {
    context.setProgress(20);

    // Initial cleanup
    fetchDataFromApi("/api/imageUpload")
      .then(async (res) => {
        if (Array.isArray(res)) {
          const deletionPromises = [];
          res.forEach((item) => {
            if (Array.isArray(item?.images)) {
              item.images.forEach((img) => {
                deletionPromises.push(
                  deleteImages(`/api/category/deleteImage?img=${img}`)
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

    // Fetch category data
    fetchDataFromApi(`/api/category/${id}`)
      .then((res) => {
        if (res?.categoryData?.[0]) {
          setcategory(res.categoryData[0]);
          setPreviews(res.categoryData[0].images || []);
          setFormFields({
            name: res.categoryData[0].name || "",
            color: res.categoryData[0].color || "",
          });
        }
        context.setProgress(100);
      })
      .catch((error) => {
        console.error("Error fetching category:", error);
        context.setProgress(100);
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Failed to load category data",
        });
      });
  }, [id, context]);

  const changeInput = (e) => {
    setFormFields((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

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
                      deleteImages(`/api/category/deleteImage?img=${img}`).then(
                        () => deleteData("/api/imageUpload/deleteAllImages")
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
    const userInfo = JSON.parse(localStorage.getItem("user"));
    if (userInfo?.email === "admin9643@gmail.com") {
      try {
        await deleteImages(`/api/category/deleteImage?img=${imgUrl}`);
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
    } else {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Only Admin can delete Category Image",
      });
    }
  };

  const editCat = async (e) => {
    e.preventDefault();

    if (
      formFields.name === "" ||
      formFields.color === "" ||
      previews.length === 0
    ) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please fill all the details",
      });
      return false;
    }

    try {
      setIsLoading(true);

      const updatedFields = {
        ...formFields,
        images: [...previews], // Use current previews as images
      };

      await editData(`/api/category/${id}`, updatedFields);
      await deleteData("/api/imageUpload/deleteAllImages");

      context.fetchCategory();
      history("/category");

      context.setAlertBox({
        open: true,
        error: false,
        msg: "Category updated successfully!",
      });
    } catch (error) {
      console.error("Error updating category:", error);
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Failed to update category",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="right-content w-100">
        <div className="card shadow border-0 w-100 flex-row p-4 mt-2">
          <h5 className="mb-0">Edit Category</h5>
          <Breadcrumbs aria-label="breadcrumb" className="ml-auto breadcrumbs_">
            <StyledBreadcrumb
              component="a"
              href="#"
              label="Dashboard"
              icon={<HomeIcon fontSize="small" />}
            />

            <StyledBreadcrumb
              component="a"
              label="Category"
              href="#"
              deleteIcon={<ExpandMoreIcon />}
            />
            <StyledBreadcrumb
              label="Edit Category"
              deleteIcon={<ExpandMoreIcon />}
            />
          </Breadcrumbs>
        </div>

        <form className="form" onSubmit={editCat}>
          <div className="row">
            <div className="col-sm-9">
              <div className="card p-4 mt-0">
                <div className="form-group">
                  <h6>Category Name</h6>
                  <input
                    type="text"
                    name="name"
                    value={formFields.name}
                    onChange={changeInput}
                  />
                </div>

                <div className="form-group">
                  <h6>Color</h6>
                  <input
                    type="text"
                    name="color"
                    value={formFields.color}
                    onChange={changeInput}
                  />
                </div>

                <div className="imagesUploadSec">
                  <h5 class="mb-4">Media And Published</h5>

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
                              onChangeFile(e, "/api/category/upload")
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

export default EditCategory;
