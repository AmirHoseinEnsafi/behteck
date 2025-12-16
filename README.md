# behteck
implementing test code for the receive detail from excel and advance search for get method 

## Installation

This app has **2 ways** to run.

---

## Way 1: Run with local MongoDB

First, you need MongoDB running on your system.

Important: this project uses **MongoDB transactions**. For transactions, MongoDB **must run as replica set**.

So your MongoDB must be started with replica set enabled.

The MongoDB connection URL **must include replicaSet** like this:

```
mongodb://localhost:27017/behteck?replicaSet=rs0
```

### Steps

1. Clone the project

```
git clone https://github.com/AmirHoseinEnsafi/behteck.git
git clone git@github.com:AmirHoseinEnsafi/behteck.git
```

2. Go to project directory

```
cd behteck
```

3. Set environment variable for mongo db url

Environment variable name is:

```
MONGODBURL
```

Example value:

```
mongodb://localhost:27017/behteck?replicaSet=rs0
```

Again: `replicaSet=rs0` is required because transactions need replica set.

4. Install dependencies

```
npm i
```

5. Start project

```
npm run start
```

---

## Way 2: Run with Docker

In this way, we use Docker to build image and run container.

MongoDB must still be replica set, same reason: **transactions**.

### Steps

1. Clone the project

```
git clone https://github.com/AmirHoseinEnsafi/behteck.git
git clone git@github.com:AmirHoseinEnsafi/behteck.git
```

2. Build Docker image

```
docker build -t behteck-app .
```

3. Run container with environment variable

```
docker run -e MONGODBURL="mongodb://YOUR_MONGO_ADDRESS:27017/behteck?replicaSet=rs0" -p 3000:3000 behteck-app
```

Replace `YOUR_MONGO_ADDRESS` with your MongoDB address.

Example (local MongoDB):

```
mongodb://localhost:27017/behteck?replicaSet=rs0
```

### Why replicaSet?

This project uses MongoDB **transactions**.

MongoDB transactions only work when MongoDB is running as **replica set**.

If you remove `replicaSet=rs0`, app will not work correctly.

---

# Code Structure (JavaScript / Express / Mongoose)

This project is written in **JavaScript**.

Reason: company is currently working with **JS + Express + Mongoose**, and this structure is designed based on that stack.

---

## File Upload Flow

For receiving files, **Multer** is used.

Upload rules:

* Only **1 file** is allowed
* Maximum file size is **10 MB**
* File type is validated by:

  * **Extension**
  * **MIME type**

The uploaded file is stored in **RAM (memory)**, not on disk.

Why memory storage?

* Fast analysis
* No need to keep Excel file on hard disk
* Better performance for temporary data

---

## Excel to JSON Conversion

After upload, a middleware is used to convert Excel file to JSON.

Library used:

```
node-xlsx
```

This package helps to read Excel files and convert them into readable data.

### Validation Logic

* The **first row** of the Excel sheet is expected to contain **column titles** (headers)
* Order of titles does **not matter**
* If required titles do not exist in the first row, process will not continue to next step

After this check, data rows are manually validated and mapped into a clean JSON structure.

---

## Controller Layer

Controller responsibility:

* Receive validated data
* Pass data to service layer

Controller has no business logic.

---

## Service Layer (Simplified Hexagonal Architecture)

Service implementation is based on a **simplified Hexagonal Architecture**.

Important notes:

* No ports are defined
* Adapters are used directly
* Business logic is very readable and isolated

### Database Logic

Database calls are written as **separate methods inside service class**.

Process flow:

1. Validate input data
2. Check if **product code already exists**
3. Check **category name** and **sub-category name**
4. Prevent re-creating existing data

---

## Transactions

All create operations are executed inside **MongoDB transactions**.

Flow:

* Each item is saved using a transaction
* If one item fails, other items are **not affected**
* No partial corruption happens

### Existing Data Response

If product code already exists:

* Existing data is returned to the client
* Client is informed which product codes already exist

This helps caller to understand current database state.

### Error Handling

If an **internal error** happens during save:

* Error is returned to the client
* Reason: each item uses its own transaction
* Failure in one transaction does not break others

---

## Query & Filtering

Filtering logic is implemented using **MongoDB Aggregation Pipeline**.

How it works:

* User filters are converted to pipeline stages
* All filters are applied inside aggregation
* Both simple and advanced filtering are supported

This approach keeps query logic:

* Clean
* Performant
* Easy to extend

---

## Query Validation

Query input is validated using **Joi**.

Validation happens inside a middleware before reaching controller.

This prevents:

* Invalid filters
* Unexpected query formats

---

## Query Result Metadata

In product query response, pagination metadata is included.

Response returns:

totalDocuments: total number of documents matched by the query (without pagination)

returnedDocuments: number of documents included in current JSON response

This helps client to understand full search result size and manage pagination correctly.

# API Usage

This section explains how to use project APIs.

---

## Import Excel Data

### Endpoint

```
POST /api/import
```

### Request Type

* Request must be sent as **form-data**
* Excel file is required

Example:

* Key: `file`
* Value: Excel file (.xlsx)

Notes:

* Only one file is accepted
* File size limit: 10 MB
* File is validated by extension and MIME type

This endpoint is used to import products from Excel file.

---

## Query Products

### Endpoint

```
GET /api/products
```

This endpoint is used to query and filter products.

All query params are optional.

---

### Query Parameters

#### status

```
status=true | false
```

Filter products by status.

---

#### minPrice / maxPrice

```
minPrice=number
maxPrice=number
```

Filter products by price range.

---

#### warrantyActive

```
warrantyActive=true | false
```

Filter products by warranty status.

---

#### categoryIds / subcategoryIds

Multiple values are allowed.

Example:

```
categoryIds=694052dfad59623b04f5b87b&categoryIds=694052dfad59623b04f5b879
subcategoryIds=694052dfad59623b04f5b87b&subcategoryIds=694052dfad59623b04f5b879
```

---

#### warrantyStartDate.from / warrantyStartDate.to

Date range filter for warranty start date.

Date format:

```
YYYY/MM/DD
```

Important:

* If year is between **1400 and 1410**, date is considered **Shamsi (Jalali)** and converted to **Gregorian** internally
* If year is outside this range, date is treated as **Gregorian**

Examples:

```
1404/10/1   // Shamsi
2025/11/1   // Gregorian
```

---

#### warrantyEndDate.from / warrantyEndDate.to

Same logic as `warrantyStartDate`, but applied to warranty end date.

---

#### sortField

Allowed values:

```
amp
price
createdAt
warrantyStartDate
warrantyEndDate
```

---

#### sortOrder

```
asc | desc
```

---

#### search

Search string using **regex**.

Search applies to:

* Item name
* Product code
* Category name
* Subcategory name

---

#### page

```
page=1
```

Page number starts from **1**.

---

#### rowsPerPage

```
rowsPerPage=number
```

Controls number of items returned per page.

---