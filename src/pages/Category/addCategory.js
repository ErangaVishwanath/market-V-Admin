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

const AddCategory = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formFields, setFormFields] = useState({
    name: "",
    images: [],
    color: "",
    slug: "",
    parentId: "",
  });

  const [previews, setPreviews] = useState([]);

  const formdata = new FormData();

  const history = useNavigate();

  const context = useContext(MyContext);

  useEffect(() => {
    // Image cleanup on component mount
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
  }, []);

  const changeInput = (e) => {
    setFormFields(() => ({
      ...formFields,
      [e.target.name]: e.target.value,
    }));
  };

  const onChangeFile = async (e, apiEndPoint) => {
    try {
      const files = e.target.files;
      setUploading(true);

      const selectedImages = [];

      // Validate and append files
      for (let i = 0; i < files.length; i++) {
        if (
          files[i] &&
          (files[i].type === "image/jpeg" ||
            files[i].type === "image/jpg" ||
            files[i].type === "image/png" ||
            files[i].type === "image/webp")
        ) {
          selectedImages.push(files[i]);
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

      formFields.images = selectedImages;

      // Upload images and process response
      const uploadResult = await uploadImage(apiEndPoint, formdata);
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

        setPreviews(uniqueImages);

        setTimeout(() => {
          setUploading(false);
          context.setAlertBox({
            open: true,
            error: false,
            msg: "Images Uploaded!",
          });
        }, 200);
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
    const imgIndex = previews.indexOf(imgUrl);

    deleteImages(`/api/category/deleteImage?img=${imgUrl}`).then((res) => {
      context.setAlertBox({
        open: true,
        error: false,
        msg: "Image Deleted!",
      });
    });

    if (imgIndex > -1) {
      // only splice array when item is found
      previews.splice(index, 1); // 2nd parameter means remove one item only
    }
  };

  const addCat = (e) => {
    e.preventDefault();

    // Use only the current previews array
    formFields.slug = formFields.name;
    formFields.images = [...previews];

    if (
      formFields.name !== "" &&
      formFields.color !== "" &&
      previews.length !== 0
    ) {
      setIsLoading(true);

      postData(`/api/category/create`, formFields)
        .then((res) => {
          setIsLoading(false);
          context.fetchCategory();
          deleteData("/api/imageUpload/deleteAllImages");
          history("/category");
        })
        .catch((error) => {
          console.error("Error creating category:", error);
          setIsLoading(false);
          context.setAlertBox({
            open: true,
            error: true,
            msg: "Failed to create category. Please try again.",
          });
        });
    } else {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please fill all the details",
      });
      return false;
    }
  };

  return (
    <>
      <div className="right-content w-100">
        <div className="card shadow border-0 w-100 flex-row p-4 mt-2">
          <h5 className="mb-0">Add Category</h5>
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
              label="Add Category"
              deleteIcon={<ExpandMoreIcon />}
            />
          </Breadcrumbs>
        </div>

        <form className="form" onSubmit={addCat}>
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

export default AddCategory;
