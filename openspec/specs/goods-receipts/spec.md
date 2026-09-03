# Goods Receipts Specification

## Purpose

Enable users to record delivered purchase-order items and keep ordered and requested quantities traceable through the completed procurement workflow.

## Requirements

### Requirement: Users can browse and view goods receipts
The system SHALL provide a Goods Receipt list and a detail view that show each receipt's number, purchase order, receipt date, status, notes, and receipt lines. The detail view SHALL show the ordered, previously received, and receipt quantities for each linked PO line.

#### Scenario: Viewing an existing goods receipt
- **WHEN** a user opens a valid Goods Receipt detail URL
- **THEN** the system displays its header and receipt lines

#### Scenario: Requesting an unknown goods receipt
- **WHEN** a client requests a Goods Receipt identifier that does not exist
- **THEN** the API returns a 404 response with a clear not-found message

### Requirement: Users can create a draft receipt from a submitted purchase order
The system SHALL allow a user to create a DRAFT Goods Receipt with a receipt date, optional notes, and one or more positive-quantity lines for open lines on one SUBMITTED purchase order. Each receipt line MUST identify a PO line and its actual receiving site, and a PO line MUST appear no more than once in a receipt.

#### Scenario: Creating a valid receipt draft
- **WHEN** a user submits a complete receipt form using open lines from a submitted purchase order
- **THEN** the system creates a DRAFT Goods Receipt and returns its detail

#### Scenario: Creating a receipt from a draft purchase order
- **WHEN** a user submits a receipt form for a purchase order that is not SUBMITTED
- **THEN** the API returns a 422 response and creates no Goods Receipt

#### Scenario: Creating a receipt with an invalid line
- **WHEN** a receipt form omits required fields, includes a non-positive quantity, repeats a PO line, or references a line outside the selected purchase order
- **THEN** the API returns a 422 response and creates no Goods Receipt

### Requirement: Users can post a draft receipt within open quantities
The system SHALL allow only a DRAFT Goods Receipt to transition to POSTED. When posting, the system MUST reject the receipt if any receipt line would cause its PO line's total received quantity to exceed the ordered quantity. A successful post MUST update all affected PO-line received quantities and the received quantities of their linked PR lines as one atomic operation.

#### Scenario: Posting a receipt within PO line open quantity
- **WHEN** a user posts a DRAFT receipt whose lines fit within their PO lines' remaining quantities
- **THEN** the receipt becomes POSTED and its PO and linked PR received quantities increase by the receipt quantities

#### Scenario: Posting a receipt that over-receives a PO line
- **WHEN** a user posts a DRAFT receipt whose quantity exceeds the remaining quantity of any referenced PO line
- **THEN** the API returns a 422 response and no receipt status or received quantities change

#### Scenario: Posting an already posted receipt
- **WHEN** a user attempts to post a Goods Receipt whose status is POSTED
- **THEN** the API returns a 422 response and leaves the receipt unchanged

### Requirement: Purchase-order detail supports receipt creation
The system SHALL expose open PO lines with their remaining receipt quantity and allow users to navigate from a submitted Purchase Order with open lines to create a Goods Receipt. A PO with no remaining receipt quantity SHALL not offer receipt creation.

#### Scenario: Starting a receipt from an eligible purchase order
- **WHEN** a user views a submitted Purchase Order that has at least one open line
- **THEN** the user can open a preselected Goods Receipt creation form for that purchase order
